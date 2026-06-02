import { Router } from 'express';
import { config } from '../config';
import { genAll } from '../lib/code-gen';
import { DOCS_ENDPOINTS, SORTS } from '../lib/docs';
import { STAT_CONFIG } from '../lib/stats';
import type { CardsService } from '../services/cards.service';

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
        statConfig: STAT_CONFIG,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
