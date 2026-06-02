const cardsSource = (process.env.CARDS_SOURCE ?? 'cloud').toLowerCase() === 'local'
  ? 'local'
  : 'cloud';

export const config = {
  port: Number(process.env.PORT ?? 3000),
  redisUrl: process.env.REDIS_URL,
  siteUrl: process.env.SITE_URL ?? `http://localhost:${Number(process.env.PORT ?? 3000)}`,
  // Where card data comes from: 'cloud' = raw GitHub (MochiiLabs) with local fallback,
  // 'local' = read only src/data/cards.json (no network).
  cardsSource: cardsSource as 'cloud' | 'local',
  rateLimit: {
    windowMs: 60_000,
    max: 120,
  },
} as const;
