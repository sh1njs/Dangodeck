import type { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

const cardSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer', example: 1 },
    name: { type: 'string', example: '2B' },
    slug: { type: 'string', example: '2b-1' },
    anime: { type: 'string', example: 'Nier: Automata' },
    element: {
      type: 'string',
      enum: ['Neutral', 'Light', 'Ground', 'Dark', 'Electric', 'Grass', 'Fire', 'Water', 'Null'],
      example: 'Neutral',
    },
    stats: {
      type: 'object',
      properties: {
        hp: { type: 'integer', example: 80 },
        atk: { type: 'integer', example: 97 },
        def: { type: 'integer', example: 66 },
        spd: { type: 'integer', example: 82 },
      },
    },
    talent: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Temporal Rewind [PSV]' },
        description: { type: 'string', example: 'Start off the battle buffing your allies...' },
      },
    },
    image: { type: 'string', example: 'https://ik.imagekit.io/anigamedb/cards/0001_2B.png' },
    lastPatch: { type: 'boolean', example: false },
  },
};

const envelope = (data: object) => ({
  type: 'object',
  properties: { success: { type: 'boolean', example: true }, data },
});

export function buildOpenApiSpec(siteUrl: string) {
  return {
    openapi: '3.0.0',
    info: {
      title: 'Dangodeck API',
      description:
        'Anime Trading Card Database & Developer API. Browse, search and fetch anime TCG cards.',
      version: '1.0.0',
    },
    servers: [{ url: siteUrl }],
    tags: [{ name: 'Cards' }, { name: 'Meta' }],
    paths: {
      '/api': {
        get: {
          tags: ['Meta'],
          summary: 'API root info',
          responses: { '200': { description: 'OK' } },
        },
      },
      '/health': {
        get: {
          tags: ['Meta'],
          summary: 'Health check',
          responses: { '200': { description: 'OK' } },
        },
      },
      '/api/cards/random': {
        get: {
          tags: ['Cards'],
          summary: 'Get a random card',
          responses: {
            '200': {
              description: 'A randomly selected card',
              content: { 'application/json': { schema: envelope(cardSchema) } },
            },
          },
        },
      },
      '/api/cards/search': {
        get: {
          tags: ['Cards'],
          summary: 'Search cards (fuzzy, typo-tolerant)',
          description: 'Case-insensitive partial + fuzzy matching. e.g. rem, reem, rme',
          parameters: [
            {
              name: 'q',
              in: 'query',
              required: true,
              schema: { type: 'string' },
              example: 'rem',
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 20, minimum: 1, maximum: 50 },
            },
          ],
          responses: {
            '200': {
              description: 'Search results',
              content: {
                'application/json': { schema: envelope({ type: 'array', items: cardSchema }) },
              },
            },
          },
        },
      },
      '/api/cards/facets': {
        get: {
          tags: ['Cards'],
          summary: 'List available filter facets (elements, animes, total)',
          responses: { '200': { description: 'Facets' } },
        },
      },
      '/api/cards': {
        get: {
          tags: ['Cards'],
          summary: 'List cards with pagination, filtering and sorting',
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
            },
            {
              name: 'sort',
              in: 'query',
              schema: {
                type: 'string',
                enum: ['id', 'name', 'anime', 'element', 'hp', 'atk', 'def', 'spd'],
              },
              description: 'Prefix with "-" for descending (e.g. -atk).',
            },
            { name: 'element', in: 'query', schema: { type: 'string' } },
            { name: 'anime', in: 'query', schema: { type: 'string' } },
            { name: 'name', in: 'query', schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Paginated card list' } },
        },
      },
      '/api/cards/{id}': {
        get: {
          tags: ['Cards'],
          summary: 'Get a card by numeric ID',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 1 },
          ],
          responses: {
            '200': {
              description: 'The card',
              content: { 'application/json': { schema: envelope(cardSchema) } },
            },
            '404': { description: 'Card not found' },
          },
        },
      },
      '/api/cards/{id}/related': {
        get: {
          tags: ['Cards'],
          summary: 'Get related cards (same anime / element)',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 1 },
          ],
          responses: { '200': { description: 'Related cards' } },
        },
      },
    },
  };
}

export function mountSwagger(app: Express, siteUrl: string): void {
  const spec = buildOpenApiSpec(siteUrl);
  app.use(
    '/docs/api',
    swaggerUi.serve,
    swaggerUi.setup(spec, { customSiteTitle: 'Dangodeck API Docs' })
  );
}
