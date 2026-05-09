import cors from 'cors';
import express, { type Express } from 'express';
import {
  getGameStats,
  getRecentGames,
  getTopDrinkers,
  getTopGivers,
  getTopWinners,
} from './db/repositories/stats';

export function createApiApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/stats/top', (_req, res) => {
    res.json({
      drinkers: getTopDrinkers(10),
      givers: getTopGivers(10),
      winners: getTopWinners(10),
      recent: getRecentGames(20),
    });
  });

  app.get('/api/games/:id', (req, res) => {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ error: 'Missing id' });
      return;
    }
    const stats = getGameStats(id);
    res.json({ gameId: id, players: stats });
  });

  return app;
}
