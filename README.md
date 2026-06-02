# Dangodeck

**Anime Trading Card Database & Developer API**

Dangodeck is a professional REST API and modern website for exploring anime TCG cards. Built to feel like a real public product in the spirit of the Pokémon TCG API, AniList, Pokédex, and TCGDex.

## Structure

Single monorepo managed with **npm workspaces** — one install, one build, one run command from the root.

```
.
├── package.json   root workspace (orchestrates api + web via concurrently)
├── api/           NestJS + TypeScript REST API (Swagger, Fuse.js fuzzy search, throttling, Redis/in-memory cache)
└── web/           Next.js 15 (App Router) + Tailwind + Neubrutalism Slim UI
```

> **Data source:** cards are loaded from the existing community database
> (`MochiiLabs/database`, 1244 cards). A local snapshot lives at `api/data/cards.json`
> and is used automatically if the remote source is unreachable.
>
> The real card schema is `{ id, name, slug, anime, element, stats{hp,atk,def,spd}, talent{name,description}, image, lastPatch }`.

## Quick start

From the **root folder** — one install handles both `api` and `web`:

```bash
npm install        # installs all workspaces
npm run build      # builds api + web
npm start          # runs BOTH: API on :4000, Web on :3000
```

That's it. Open:

- Web → http://localhost:3000
- API → http://localhost:4000 (Swagger at http://localhost:4000/docs/api)

### Development (hot reload)

```bash
npm run dev        # API (watch) + Web (next dev) together
```

### Run just one side

```bash
npm run dev:api    # or  npm run start:api
npm run dev:web    # or  npm run start:web
```

Redis is optional — set `REDIS_URL` (see `api/.env.example`) to enable it, otherwise an in-memory cache is used automatically. Set `API_URL` / `NEXT_PUBLIC_API_URL` only if the API runs somewhere other than `http://localhost:4000` (see `web/.env.example`).

## API endpoints

Base URL: `/api`

| Method | Path                      | Description                                                   |
| ------ | ------------------------- | ------------------------------------------------------------- |
| GET    | `/api/cards/random`       | A random card                                                 |
| GET    | `/api/cards/:id`          | Card by numeric ID                                            |
| GET    | `/api/cards/search?q=rem` | Fuzzy, typo-tolerant search                                   |
| GET    | `/api/cards`              | List with `page`, `limit`, `sort`, `element`, `anime`, `name` |
| GET    | `/api/cards/:id/related`  | Related cards (same anime / element)                          |
| GET    | `/api/cards/facets`       | Available elements & anime titles                             |

All successful responses use the envelope `{ "success": true, "data": ... }`.

Interactive docs: **`/docs/api`** (Swagger), and a hand-built reference at the website's **`/docs`**.

## Website pages

- `/` — landing (hero, stats, featured cards & endpoints)
- `/home` — about, creator, community, contributing
- `/docs` — API reference with code samples (JS, TS, Python, PHP, Go, cURL)
- `/cards` — catalog with fuzzy search, element/anime filters, sorting, infinite scroll
- `/cards/[id]` — card detail with stats, talent, and related cards

Dark/light mode, SEO metadata, OpenGraph/Twitter cards, sitemap, and robots are all included.

---

Built by **Shieun** ([github.com/sh1njs](https://github.com/sh1njs)) · Community: KKN (Keluh Kesah Ngoding) · Open Source.
