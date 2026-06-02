import { Router } from 'express';
import { parseListQuery, parseSearchQuery } from '../lib/query';
import type { CacheService } from '../services/cache.service';
import type { CardsService } from '../services/cards.service';
import type { Card } from '../lib/types';

function ok<T>(data: T) {
  return { success: true, data };
}

export function createApiRouter(cards: CardsService, cache: CacheService): Router {
  const router = Router();

  // Meta
  router.get('/', (_req, res) => {
    res.json(
      ok({
        name: 'Dangodeck API',
        tagline: 'Anime Trading Card Database & Developer API',
        docs: '/docs/api',
        endpoints: [
          'GET /api/cards/random',
          'GET /api/cards/:id',
          'GET /api/cards/search?q=rem',
          'GET /api/cards',
        ],
      })
    );
  });

  router.get('/health', async (_req, res) => {
    const all = await cards.getAllRaw();
    res.json({ success: true, status: 'ok', cards: all.length });
  });

  // Cards
  router.get('/cards/random', async (_req, res) => {
    res.json(ok(await cards.getRandom()));
  });

  router.get('/cards/search', async (req, res) => {
    const query = parseSearchQuery(req.query);
    if (!query.q) {
      return res.status(400).json({ success: false, error: 'Query parameter "q" is required.' });
    }
    const key = `cards:search:${query.q.toLowerCase()}:${query.limit}`;
    const cached = await cache.get<Card[]>(key);
    if (cached) return res.json(ok(cached));
    const results = await cards.search(query);
    await cache.set(key, results, 120);
    res.json(ok(results));
  });

  router.get('/cards/facets', async (_req, res) => {
    const key = 'cards:facets';
    const cached = await cache.get<unknown>(key);
    if (cached) return res.json(ok(cached));
    const data = await cards.facets();
    await cache.set(key, data, 300);
    res.json(ok(data));
  });

  router.get('/cards', async (req, res) => {
    const query = parseListQuery(req.query);
    const key = `cards:list:${JSON.stringify(query)}`;
    const cached = await cache.get<unknown>(key);
    if (cached) return res.json(ok(cached));
    const data = await cards.list(query);
    await cache.set(key, data, 60);
    res.json(ok(data));
  });

  router.get('/cards/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ success: false, error: 'Card id must be an integer.' });
    }
    const key = `cards:id:${id}`;
    const cached = await cache.get<Card>(key);
    if (cached) return res.json(ok(cached));
    const card = await cards.getById(id);
    if (!card) {
      return res.status(404).json({ success: false, error: `Card with id=${id} not found.` });
    }
    await cache.set(key, card, 300);
    res.json(ok(card));
  });

  router.get('/cards/:id/related', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ success: false, error: 'Card id must be an integer.' });
    }
    res.json(ok(await cards.related(id)));
  });

  return router;
}
