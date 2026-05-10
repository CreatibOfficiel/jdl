import cors from 'cors';
import express, { type Express } from 'express';
import {
  addGameToSeason,
  createSeason,
  getSeasonById,
  getSeasonGameIds,
  getSeasonStandings,
  listSeasons,
} from './db/repositories/seasons';
import {
  getGameById,
  getGameSipEvents,
  getGameStats,
  getPlayerById,
  getPlayerRecentGames,
  getRecentGames,
  getTopAthletes,
  getTopDrinkers,
  getTopGivers,
  getTopPairs,
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
      pairs: getTopPairs(10),
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

  app.get('/api/players/:id', (req, res) => {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ error: 'Missing id' });
      return;
    }
    const player = getPlayerById(id);
    if (!player) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }
    res.json({ player, recent: getPlayerRecentGames(id, 20) });
  });

  app.get('/api/seasons', (_req, res) => {
    res.json({ seasons: listSeasons(50) });
  });

  app.post('/api/seasons', (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name : '';
    if (!name.trim()) {
      res.status(400).json({ error: 'name required' });
      return;
    }
    try {
      const season = createSeason(name);
      res.json(season);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.get('/api/seasons/:id', (req, res) => {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ error: 'Missing id' });
      return;
    }
    const season = getSeasonById(id);
    if (!season) {
      res.status(404).json({ error: 'Season not found' });
      return;
    }
    res.json({
      season,
      gameIds: getSeasonGameIds(id),
      standings: getSeasonStandings(id),
    });
  });

  app.post('/api/seasons/:id/games', (req, res) => {
    const id = req.params.id;
    const gameId = typeof req.body?.gameId === 'string' ? req.body.gameId : '';
    if (!id || !gameId) {
      res.status(400).json({ error: 'Missing id or gameId' });
      return;
    }
    const ok = addGameToSeason(id, gameId);
    if (!ok) {
      res.status(404).json({ error: 'Season not found or insert failed' });
      return;
    }
    res.json({ ok: true });
  });

  return app;
}
