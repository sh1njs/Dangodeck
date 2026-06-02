import { Router } from 'express';
import { config } from '../config';
import { genAll } from '../lib/code-gen';
import type { CardsService } from '../services/cards.service';

const DOCS_ENDPOINTS = [
  {
    id: 'ep-random',
    method: 'GET',
    path: '/api/cards/random',
    title: 'Random Card',
    desc: 'Returns a single randomly selected card from the database.',
    params: [] as { name: string; type: string; desc: string }[],
  },
  {
    id: 'ep-id',
    method: 'GET',
    path: '/api/cards/1',
    title: 'Card by ID',
    desc: 'Returns the card matching the given numeric ID. Returns 404 if not found.',
    params: [{ name: 'id', type: 'number (path)', desc: 'Numeric ID of the card.' }],
  },
  {
    id: 'ep-search',
    method: 'GET',
    path: '/api/cards/search?q=rem',
    title: 'Search Cards',
    desc: 'Case-insensitive, partial, and typo-tolerant fuzzy search (Fuse.js + Levenshtein). e.g. rem, reem, rme all match "Rem".',
    params: [
      { name: 'q', type: 'string (required)', desc: 'Search query.' },
      { name: 'limit', type: 'number (1-50)', desc: 'Max results. Default 20.' },
    ],
  },
  {
    id: 'ep-list',
    method: 'GET',
    path: '/api/cards?page=1&limit=20',
    title: 'List Cards',
    desc: 'Returns a paginated, filterable, sortable list of cards.',
    params: [
      { name: 'page', type: 'number', desc: 'Page number. Default 1.' },
      { name: 'limit', type: 'number (1-100)', desc: 'Items per page. Default 20.' },
      {
        name: 'sort',
        type: 'string',
        desc: 'One of id, name, anime, element, hp, atk, def, spd. Prefix "-" for descending.',
      },
      { name: 'element', type: 'string', desc: 'Filter by element (Fire, Water, Dark...).' },
      { name: 'anime', type: 'string', desc: 'Filter by anime title (contains).' },
      { name: 'name', type: 'string', desc: 'Filter by card name (contains).' },
    ],
  },
];

const SORTS = [
  { value: 'id', label: 'ID (asc)' },
  { value: '-id', label: 'ID (desc)' },
  { value: 'name', label: 'Name A-Z' },
  { value: '-name', label: 'Name Z-A' },
  { value: '-atk', label: 'ATK (high)' },
  { value: '-hp', label: 'HP (high)' },
  { value: '-spd', label: 'SPD (high)' },
];

export function createWebRouter(cards: CardsService): Router {
  const router = Router();

  router.get('/', async (_req, res, next) => {
    try {
      const [facets, list] = await Promise.all([
        cards.facets(),
        cards.list({ page: 1, limit: 5, sort: '-atk' }),
      ]);
      res.render('landing', {
        page: 'home',
        title: 'Dangodeck - Anime Trading Card Database & Developer API',
        description:
          'Dangodeck is an Anime Trading Card Game database and professional developer API. Browse cards, fuzzy-search, and build with a fast REST API.',
        total: facets.total,
        elements: facets.elements.length,
        animes: facets.animes.length,
        featured: list.items,
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/cards', async (_req, res, next) => {
    try {
      const [facets, list] = await Promise.all([
        cards.facets(),
        cards.list({ page: 1, limit: 24, sort: 'id' }),
      ]);
      res.render('cards', {
        page: 'cards',
        title: 'Cards - Dangodeck',
        description:
          'Browse the full Dangodeck anime TCG card catalog. Search, filter by element and anime, and sort.',
        facets,
        sorts: SORTS,
        initialCards: list.items,
        total: list.total,
        totalPages: list.totalPages,
        limit: 24,
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/docs', (_req, res) => {
    const base = config.siteUrl;
    const endpoints = DOCS_ENDPOINTS.map((ep) => ({ ...ep, examples: genAll(base, ep.path) }));
    res.render('docs', {
      page: 'docs',
      title: 'API Docs - Dangodeck',
      description:
        'Dangodeck REST API documentation - endpoints, parameters, rate limits, and code examples in 6 languages.',
      base,
      endpoints,
    });
  });

  router.get('/home', (_req, res) => {
    res.render('home', {
      page: 'about',
      title: 'About - Dangodeck',
      description: 'About Dangodeck - the open-source anime TCG database and developer API.',
    });
  });

  router.get('/cards/:id', async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const card = Number.isInteger(id) ? await cards.getById(id) : null;
      if (!card) {
        return res.status(404).render('404', {
          page: '',
          title: 'Card not found - Dangodeck',
          description: 'The requested card could not be found.',
        });
      }
      const related = await cards.related(card.id);
      const max = Math.max(card.stats.hp, card.stats.atk, card.stats.def, card.stats.spd, 100);
      res.render('card-detail', {
        page: 'cards',
        title: `${card.name} - ${card.anime} - Dangodeck`,
        description: `${card.name} from ${card.anime} - ${card.element} element. ${card.talent.name}.`,
        ogImage: card.image,
        card,
        related,
        max,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
