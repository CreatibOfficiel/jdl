import { type ChildProcess, spawn } from 'node:child_process';
import { mkdtempSync, rmdirSync, unlinkSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

export interface TestServer {
  wsUrl: string;
  httpUrl: string;
  cleanup: () => Promise<void>;
}

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address() as AddressInfo;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

let procCounter = 0;

export async function createTestServer(): Promise<TestServer> {
  procCounter++;
  const port = await getFreePort();
  const dbDir = mkdtempSync(join(tmpdir(), 'jeu-soiree-test-'));
  const dbPath = join(dbDir, `test-${procCounter}.db`);

  const appDir = dirname(dirname(dirname(resolve(__filename))));
  const entryPath = join(appDir, 'src/index.ts');
  const child: ChildProcess = spawn('npx', ['tsx', entryPath], {
    cwd: appDir,
    env: { ...process.env, PORT: String(port), DB_PATH: dbPath },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  child.stdout?.on('data', (d: Buffer) => {
    stdout += d.toString();
  });
  child.stderr?.on('data', (d: Buffer) => {
    stderr += d.toString();
  });

  const wsUrl = `ws://127.0.0.1:${port}`;
  const httpUrl = `http://127.0.0.1:${port}`;

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Server did not start within 10s\nstdout: ${stdout}\nstderr: ${stderr}`));
    }, 10_000);

    const check = () => {
      if (stdout.includes('Colyseus listening')) {
        clearTimeout(timeout);
        resolve();
      }
    };
    child.stdout?.on('data', check);
    check();
  });

  return {
    wsUrl,
    httpUrl,
    cleanup: async () => {
      child.kill('SIGINT');
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, 5000);
        child.on('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
      try {
        unlinkSync(dbPath);
      } catch {}
      try {
        rmdirSync(dbDir);
      } catch {}
    },
  };
}
