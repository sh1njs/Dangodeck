# Dangodeck

An Anime Trading Card Game database and REST API built with [Express](https://expressjs.com/), TypeScript, and [Fuse.js](https://www.fusejs.io/). Features a full-stack web UI, paginated card browser, fuzzy search, and a public JSON API with Swagger/OpenAPI docs.

> Built by [sh1njs](https://github.com/sh1njs)

---

## Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Web Pages](#web-pages)
- [Card Data Schema](#card-data-schema)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running in Development](#running-in-development)
  - [Building for Production](#building-for-production)
- [Caching](#caching)
- [Rate Limiting](#rate-limiting)
- [Deployment](#deployment)
- [Tech Stack](#tech-stack)

---

## Features

- REST API with 6 endpoints — browse, filter, sort, search, and fetch cards by ID
- Typo-tolerant fuzzy search via Fuse.js (exact → partial → fuzzy, priority-ordered)
- Paginated card list with filtering by element, anime, and name, plus multi-field sorting
- Card data auto-fetched from a remote source on startup, with local JSON snapshot fallback
- Database refreshes in-memory every 5 minutes without downtime
- Dual caching layer — Redis when available, in-memory fallback when not
- Full Swagger/OpenAPI 3.0 docs at `/docs/api` with live try-it-out support
- Custom `/docs` page with code examples in 6 languages (cURL, JS, TS, Python, PHP, Go)
- Server-side rendered UI with EJS templates, card detail pages, and related card suggestions
- CORS-open API, gzip compression, and rate limiting baked in

---

## Project Structure

```
src/
├── server.ts                 # Entry point — bootstraps Express, mounts routes
├── config.ts                 # Server config (port, Redis URL, site URL, rate limit)
├── swagger.ts                # OpenAPI 3.0 spec + swagger-ui-express mount
├── lib/
│   ├── types.ts              # Shared TypeScript interfaces (Card, Facets, Paginated...)
│   ├── query.ts              # Query string parsers (list + search)
│   ├── stats.ts              # Stat scaling model + STAT_CONFIG (server/client source of truth)
│   ├── code-gen.ts           # Code example generator (6 languages)
│   ├── docs.ts               # /docs page metadata (endpoint catalog + sort options)
│   ├── elements.ts           # Element → color mapping
│   └── icons.ts              # SVG icon helpers for templates
├── routes/
│   ├── api.routes.ts         # All /api/* endpoints
│   └── web.routes.ts         # Web UI routes (renders EJS pages)
└── services/
    ├── cards.service.ts      # Card loading (cloud), normalization, search, list, facets, related
    └── cache.service.ts      # Redis + in-memory fallback cache

views/                        # EJS templates
├── landing.ejs               # Homepage
├── cards.ejs                 # Card browser (paginated, filterable)
├── card-detail.ejs           # Individual card page
├── docs.ejs                  # Developer docs with code examples
├── home.ejs                  # About page
├── 404.ejs                   # Error page
└── partials/
    ├── head.ejs
    ├── header.ejs
    ├── footer.ejs
    ├── page-header.ejs       # Reusable page title/lead header (shared rhythm)
    └── card-tile.ejs

public/                       # Static assets served directly
├── styles.css                # Single stylesheet organized with CSS @layer + design tokens
├── cards.js                  # Client-side card browser (filtering, pagination)
├── card-detail.js            # Interactive stat calculator
├── docs.js                   # Client-side docs interactions
└── nav.js                    # Mobile nav toggle

scripts/
└── copy-assets.mjs           # Post-build: copies views/ + public/ into dist/
```

> **Styling** — `public/styles.css` is a single served file organized with native
> CSS cascade layers (`tokens → base → layout → components → pages → utilities →
> responsive → motion`). Spacing, typography, and layout use design tokens (a 4px
> spacing scale + `clamp()` fluid type), and the responsive system is mobile-first
> across `480 / 640 / 768 / 1024 / 1280 / 1536` breakpoints (small-mobile to ultra-wide).

---

## API Endpoints

All endpoints return a consistent JSON envelope:

```json
{ "success": true, "data": ... }
```

Errors return `{ "success": false, "error": "..." }` with the appropriate HTTP status code.

### Cards

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api` | API root — name, tagline, available endpoints |
| `GET` | `/api/health` | Health check — returns status and total card count |
| `GET` | `/api/cards` | List cards (paginated, filterable, sortable) |
| `GET` | `/api/cards/random` | Random card with a randomly rolled rarity/level/evo/ascension and the resulting **calculated** stats |
| `GET` | `/api/cards/random/base` | Random card with **base** stats only |
| `GET` | `/api/cards/search` | Fuzzy search by name or anime |
| `GET` | `/api/cards/facets` | Returns all unique elements, animes, and total card count |
| `GET` | `/api/cards/:id` | Fetch a single card by numeric ID |
| `GET` | `/api/cards/:id/stats` | Calculate a card's stats for chosen tiers: `final = round(base × rarity × level × evo × ascension)` |
| `GET` | `/api/cards/:id/related` | Returns up to 6 related cards (same anime first, then same element) |

### Query Parameters

**`GET /api/cards`**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | `1` | Page number |
| `limit` | number (1–100) | `20` | Items per page |
| `sort` | string | — | Field to sort by. Prefix `-` for descending. One of: `id`, `name`, `anime`, `element`, `hp`, `atk`, `def`, `spd` |
| `element` | string | — | Filter by element (exact match, case-insensitive) |
| `anime` | string | — | Filter by anime title (contains, case-insensitive) |
| `name` | string | — | Filter by card name (contains, case-insensitive) |

**`GET /api/cards/search`**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `q` | string | **required** | Search query — typo-tolerant fuzzy matching |
| `limit` | number (1–50) | `20` | Max results |

**`GET /api/cards/:id/stats`**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `rarity` | string | `base` | One of `base`, `common`, `uncommon`, `rare`, `super_rare`, `ultra_rare` |
| `level` | number (1–100) | `1` | Card level |
| `evo` | number (1–3) | `1` | Evolution stage |
| `ascension` | number (0–5) | `0` | Ascension rank |

### Stat Scaling

The database stores **base** stats only. Effective stats scale with four independent tiers, each contributing a multiplier:

```
final = round(base × rarityMult × levelMult × evoMult × ascensionMult)
```

| Tier | Range | Multiplier |
|------|-------|------------|
| Rarity | base → ultra_rare | ×1.0, ×1.1, ×1.25, ×1.5, ×1.8, ×2.2 |
| Level | 1 → 100 | ×(1 + (level − 1) × 0.01) → up to ×1.99 |
| Evolution | 1 → 3 | ×1.0, ×1.3, ×1.65 |
| Ascension | 0 → 5 | ×1.0, ×1.08, ×1.16, ×1.24, ×1.32, ×1.4 |

Defaults (base / level 1 / evo 1 / ascension 0) resolve to ×1.0, so calculated stats equal the base stats. All values live in `src/lib/stats.ts`. The card detail page (`/cards/:id`) includes an interactive calculator to preview stats across tiers.

---

## Web Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page — overview, stats, and featured cards |
| `/cards` | Browsable card catalog with live filtering and sorting |
| `/cards/:id` | Card detail page with stats, talent, and related cards |
| `/docs` | Developer API docs with endpoint reference and code examples |
| `/home` | About page |

Interactive API documentation (Swagger UI) is available at `/docs/api`.

---

## Card Data Schema

Each card object contains:

```ts
interface Card {
  id: number;           // Unique numeric ID
  name: string;         // Character name
  slug: string;         // URL-friendly identifier, e.g. "rem-12"
  anime: string;        // Source anime title
  element: string;      // One of: Neutral, Light, Ground, Dark, Electric, Grass, Fire, Water, Null
  stats: {
    hp: number;
    atk: number;
    def: number;
    spd: number;
  };
  talent: {
    name: string;       // Talent/ability name
    description: string;
  };
  image: string;        // Card image URL
  lastPatch: boolean;   // Whether the card was updated in the last patch
}
```

The database currently contains **1,244 cards** across multiple anime series and elements.

Card data is loaded from the [MochiiLabs Dangodeck-Database](https://github.com/MochiiLabs/Dangodeck-Database) cloud source on startup and refreshed every 5 minutes in the background. If a refresh fails, the server keeps serving the last successfully loaded data.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- Redis (optional — falls back to in-memory cache without it)

### Installation

```bash
git clone https://github.com/sh1njs/dangodeck.git
cd dangodeck
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | — | `3000` | Port the server listens on |
| `REDIS_URL` | — | — | Redis connection URL. If omitted, in-memory cache is used instead |
| `SITE_URL` | — | `http://localhost:3000` | Public base URL — used by Swagger as the API server URL |

### Running in Development

```bash
npm run dev
```

Uses `tsx watch` — the server auto-restarts on any file change. No build step required.

### Building for Production

```bash
npm run build
```

This compiles TypeScript to `dist/` and copies `views/`, `public/`, and `data/` into `dist/` via `scripts/copy-assets.mjs`.

```bash
npm start
```

Runs the compiled output from `dist/server.js`. Requires `NODE_ENV` and env variables to be set (either via `.env` file or the host environment).

To type-check without emitting:

```bash
npm run typecheck
```

---

## Caching

Dangodeck uses a two-tier cache with automatic fallback:

- **Redis** — used when `REDIS_URL` is configured and the connection is healthy. TTLs vary per endpoint (60s for list, 120s for search, 300s for individual cards and facets).
- **In-memory** — used automatically if Redis is not configured or the connection drops. Same TTL behavior.

If Redis goes down mid-run, the server logs a warning and silently continues using memory. No restart needed.

---

## Rate Limiting

The `/api/*` routes are rate-limited to **120 requests per minute per IP** using `express-rate-limit`. Requests over the limit receive:

```json
{ "success": false, "error": "Too Many Requests" }
```

Standard rate-limit headers (`RateLimit-*`) are included in all API responses.

---

## Deployment

Dangodeck is a standard Node.js HTTP server and runs anywhere Node.js 18+ is supported.

**PM2 (VPS):**

```bash
npm run build
npm install -g pm2
pm2 start npm --name Dangodeck -- run dev
pm2 save && pm2 startup
```

**Docker:**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
CMD ["node", "--env-file=.env", "dist/server.js"]
```

**Railway / Render / Fly.io:**
Set the build command to `npm run build` and the start command to `npm start`. Configure `PORT`, `SITE_URL`, and optionally `REDIS_URL` in the platform's environment settings.

---

## Tech Stack

| Package | Purpose |
|---------|---------|
| [Express](https://expressjs.com/) | HTTP server and routing |
| [TypeScript](https://www.typescriptlang.org/) | Type-safe development |
| [EJS](https://ejs.co/) | Server-side HTML templating |
| [Fuse.js](https://www.fusejs.io/) | Fuzzy search with scoring |
| [ioredis](https://github.com/redis/ioredis) | Redis client with auto-reconnect |
| [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) | API rate limiting |
| [swagger-ui-express](https://github.com/scottie1984/swagger-ui-express) | Swagger UI for OpenAPI docs |
| [compression](https://github.com/expressjs/compression) | Gzip response compression |
| [tsx](https://github.com/privatenumber/tsx) | TypeScript execution for dev mode |

---

## License

MIT © [sh1njs](https://github.com/sh1njs)
