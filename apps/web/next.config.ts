import type { NextConfig } from 'next';

const config: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@jeu-soiree/shared', '@jeu-soiree/game-logic'],
};

export default config;
