"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
class CacheService {
    redis = null;
    redisHealthy = false;
    mem = new Map();
    constructor(url) {
        if (!url) {
            console.log('[cache] REDIS_URL not set — using in-memory cache.');
            return;
        }
        try {
            this.redis = new ioredis_1.default(url, {
                lazyConnect: true,
                maxRetriesPerRequest: 1,
                retryStrategy: () => null,
            });
            this.redis.on('error', (err) => {
                if (this.redisHealthy) {
                    console.warn(`[cache] Redis error, falling back to memory: ${err.message}`);
                }
                this.redisHealthy = false;
            });
            this.redis.on('ready', () => {
                this.redisHealthy = true;
                console.log('[cache] Redis connected.');
            });
            void this.redis.connect().catch((err) => {
                console.warn(`[cache] Redis connect failed, using memory cache: ${err.message}`);
                this.redisHealthy = false;
            });
        }
        catch (err) {
            console.warn(`[cache] Redis init failed: ${err.message}`);
            this.redis = null;
        }
    }
    async get(key) {
        if (this.redis && this.redisHealthy) {
            try {
                const raw = await this.redis.get(key);
                return raw ? JSON.parse(raw) : null;
            }
            catch {
                // fall through to memory
            }
        }
        const entry = this.mem.get(key);
        if (!entry)
            return null;
        if (entry.expiresAt < Date.now()) {
            this.mem.delete(key);
            return null;
        }
        return JSON.parse(entry.value);
    }
    async set(key, value, ttlSeconds) {
        const raw = JSON.stringify(value);
        if (this.redis && this.redisHealthy) {
            try {
                await this.redis.set(key, raw, 'EX', ttlSeconds);
                return;
            }
            catch {
                // fall through to memory
            }
        }
        this.mem.set(key, { value: raw, expiresAt: Date.now() + ttlSeconds * 1000 });
    }
    disconnect() {
        if (this.redis)
            this.redis.disconnect();
    }
}
exports.CacheService = CacheService;
//# sourceMappingURL=cache.service.js.map