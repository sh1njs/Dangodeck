"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApiRouter = createApiRouter;
const express_1 = require("express");
const query_1 = require("../lib/query");
const stats_1 = require("../lib/stats");
function ok(data) {
    return { success: true, data };
}
// Build a card payload whose `stats` are the calculated (tiered) stats — a
// drop-in replacement for the base card, plus the roll/multiplier breakdown.
function withCalculatedStats(card, params) {
    const { params: applied, multipliers, stats } = (0, stats_1.calcStats)(card.stats, params);
    return { ...card, stats, baseStats: card.stats, params: applied, multipliers };
}
function createApiRouter(cards, cache) {
    const router = (0, express_1.Router)();
    // Meta
    router.get('/', (_req, res) => {
        res.json(ok({
            name: 'Dangodeck API',
            tagline: 'Anime Trading Card Database & Developer API',
            docs: '/docs/api',
            endpoints: [
                'GET /api/cards/random',
                'GET /api/cards/random/base',
                'GET /api/cards/:id',
                'GET /api/cards/:id/stats?rarity=&level=&evo=&ascension=',
                'GET /api/cards/search?q=rem',
                'GET /api/cards',
            ],
        }));
    });
    router.get('/health', async (_req, res) => {
        const all = await cards.getAllRaw();
        res.json({ success: true, status: 'ok', cards: all.length });
    });
    // Cards
    // Random card with a randomly rolled rarity/level/evo/ascension and the
    // resulting calculated stats — convenient for game bots.
    router.get('/cards/random', async (_req, res) => {
        const card = await cards.getRandom();
        res.json(ok(withCalculatedStats(card, (0, stats_1.rollRandomParams)())));
    });
    // Random card with base stats only (legacy behaviour).
    router.get('/cards/random/base', async (_req, res) => {
        res.json(ok(await cards.getRandom()));
    });
    router.get('/cards/search', async (req, res) => {
        const query = (0, query_1.parseSearchQuery)(req.query);
        if (!query.q) {
            return res.status(400).json({ success: false, error: 'Query parameter "q" is required.' });
        }
        const key = `cards:search:${query.q.toLowerCase()}:${query.limit}`;
        const cached = await cache.get(key);
        if (cached)
            return res.json(ok(cached));
        const results = await cards.search(query);
        await cache.set(key, results, 120);
        res.json(ok(results));
    });
    router.get('/cards/facets', async (_req, res) => {
        const key = 'cards:facets';
        const cached = await cache.get(key);
        if (cached)
            return res.json(ok(cached));
        const data = await cards.facets();
        await cache.set(key, data, 300);
        res.json(ok(data));
    });
    router.get('/cards', async (req, res) => {
        const query = (0, query_1.parseListQuery)(req.query);
        const key = `cards:list:${JSON.stringify(query)}`;
        const cached = await cache.get(key);
        if (cached)
            return res.json(ok(cached));
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
        const cached = await cache.get(key);
        if (cached)
            return res.json(ok(cached));
        const card = await cards.getById(id);
        if (!card) {
            return res.status(404).json({ success: false, error: `Card with id=${id} not found.` });
        }
        await cache.set(key, card, 300);
        res.json(ok(card));
    });
    // Deterministic stat calculation for a specific card + chosen tiers.
    router.get('/cards/:id/stats', async (req, res) => {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) {
            return res.status(400).json({ success: false, error: 'Card id must be an integer.' });
        }
        const card = await cards.getById(id);
        if (!card) {
            return res.status(404).json({ success: false, error: `Card with id=${id} not found.` });
        }
        res.json(ok(withCalculatedStats(card, {
            rarity: req.query.rarity,
            level: req.query.level,
            evo: req.query.evo,
            ascension: req.query.ascension,
        })));
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
//# sourceMappingURL=api.routes.js.map