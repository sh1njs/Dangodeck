import path from 'path';
import compression from 'compression';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { elementColor, ELEMENT_COLORS } from './lib/elements';
import { icon } from './lib/icons';
import { createApiRouter } from './routes/api.routes';
import { createWebRouter } from './routes/web.routes';
import { CacheService } from './services/cache.service';
import { CardsService } from './services/cards.service';
import { mountSwagger } from './swagger';

const ROOT = path.resolve(__dirname, '..');

async function bootstrap(): Promise<void> {
  const cards = new CardsService();
  const cache = new CacheService(config.redisUrl);
  await cards.init();

  const app = express();

  app.set('trust proxy', true);
  app.disable('x-powered-by');

  app.set('view engine', 'ejs');
  app.set('views', path.join(ROOT, 'views'));

  app.locals.icon = icon;
  app.locals.elementColor = elementColor;
  app.locals.elementColors = ELEMENT_COLORS;
  app.locals.siteUrl = config.siteUrl;

  app.use(compression());
  app.use(express.static(path.join(ROOT, 'public')));

  // Public JSON API: permissive CORS + rate limiting.
  app.use('/api', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
  app.use(
    '/api',
    rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, error: 'Too Many Requests' },
    })
  );

  mountSwagger(app, config.siteUrl);
  app.use('/api', createApiRouter(cards, cache));
  app.use('/', createWebRouter(cards));

  // Not found
  app.use((req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    res.status(404).render('404', {
      page: '',
      title: 'Not found - Dangodeck',
      description: 'The requested page could not be found.',
    });
  });

  // Error handler
  app.use(
    (err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('[error]', err);
      if (req.path.startsWith('/api')) {
        return res.status(500).json({ success: false, error: 'Internal server error' });
      }
      res.status(500).render('404', {
        page: '',
        title: 'Error - Dangodeck',
        description: 'Something went wrong.',
      });
    }
  );

  app.listen(config.port, '0.0.0.0', () => {
    console.log(`Dangodeck running on ${config.siteUrl} (API docs: /docs/api)`);
  });

  const shutdown = () => {
    cache.disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

void bootstrap();
