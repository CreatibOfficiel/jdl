import cors from 'cors';
import express, { type Express } from 'express';
import {
  getGameById,
  getGameSipEvents,
  getGameStats,
  getRecentGames,
  getTopAthletes,
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
      athletes: getTopAthletes(10),
      recent: getRecentGames(20),
    });
  });

  app.get('/api/games/:id', (req, res) => {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ error: 'Missing id' });
      return;
    }
    const game = getGameById(id);
    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }
    res.json({ game, players: getGameStats(id) });
  });

  app.get('/api/games/:id/sips', (req, res) => {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ error: 'Missing id' });
      return;
    }
    res.json({ gameId: id, events: getGameSipEvents(id) });
  });

  return app;
}
