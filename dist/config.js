"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.config = {
    port: Number(process.env.PORT ?? 3000),
    redisUrl: process.env.REDIS_URL,
    siteUrl: process.env.SITE_URL ?? `http://localhost:${Number(process.env.PORT ?? 3000)}`,
    rateLimit: {
        windowMs: 60_000,
        max: 120,
    },
};
//# sourceMappingURL=config.js.map