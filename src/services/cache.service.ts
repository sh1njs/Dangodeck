import Redis from 'ioredis';

interface MemEntry {
  value: string;
  expiresAt: number;
}

export class CacheService {
  private redis: Redis | null = null;
  private redisHealthy = false;
  private readonly mem = new Map<string, MemEntry>();

  constructor(url?: string) {
    if (!url) {
      console.log('[cache] REDIS_URL not set — using in-memory cache.');
      return;
    }
    try {
      this.redis = new Redis(url, {
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
      void this.redis.connect().catch((err: Error) => {
        console.warn(`[cache] Redis connect failed, using memory cache: ${err.message}`);
        this.redisHealthy = false;
      });
    } catch (err) {
      console.warn(`[cache] Redis init failed: ${(err as Error).message}`);
      this.redis = null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.redis && this.redisHealthy) {
      try {
        const raw = await this.redis.get(key);
        return raw ? (JSON.parse(raw) as T) : null;
      } catch {
        // fall through to memory
      }
    }
    const entry = this.mem.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.mem.delete(key);
      return null;
    }
    return JSON.parse(entry.value) as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const raw = JSON.stringify(value);
    if (this.redis && this.redisHealthy) {
      try {
        await this.redis.set(key, raw, 'EX', ttlSeconds);
        return;
      } catch {
        // fall through to memory
      }
    }
    this.mem.set(key, { value: raw, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  disconnect(): void {
    if (this.redis) this.redis.disconnect();
  }
}
