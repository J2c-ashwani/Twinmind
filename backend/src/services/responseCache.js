import redis from 'redis';
import { promisify } from 'util';

class ResponseCache {
    constructor() {
        // Use Redis if available, otherwise in-memory
        this.useRedis = !!process.env.REDIS_URL;

        if (this.useRedis) {
            this.client = redis.createClient({
                url: process.env.REDIS_URL,
            });
            this.getAsync = promisify(this.client.get).bind(this.client);
            this.setAsync = promisify(this.client.setex).bind(this.client);
        } else {
            // Bounded in-memory cache to protect low-memory containers when Redis is disabled
            this.maxEntries = parseInt(process.env.RESPONSE_CACHE_MAX_ENTRIES, 10) || 250;
            this.cache = new Map();
        }

        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
        };
    }

    /**
     * Get cached response
     */
    async get(key) {
        try {
            let value;

            if (this.useRedis) {
                value = await this.getAsync(key);
            } else {
                const cached = this.cache.get(key);
                if (cached) {
                    if (cached.expires > Date.now()) {
                        value = cached.value;
                    } else {
                        this.cache.delete(key);
                    }
                }
            }

            if (value) {
                this.stats.hits++;
                return JSON.parse(value);
            }

            this.stats.misses++;
            return null;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }

    /**
     * Set cached response
     */
    async set(key, value, ttl = 3600) {
        try {
            const stringValue = JSON.stringify(value);

            if (this.useRedis) {
                await this.setAsync(key, ttl, stringValue);
            } else {
                const now = Date.now();
                if (this.cache.has(key)) {
                    this.cache.delete(key);
                } else if (this.cache.size >= this.maxEntries) {
                    for (const [k, entry] of this.cache.entries()) {
                        if (entry.expires <= now) this.cache.delete(k);
                    }
                    while (this.cache.size >= this.maxEntries) {
                        const oldestKey = this.cache.keys().next().value;
                        this.cache.delete(oldestKey);
                    }
                }
                this.cache.set(key, {
                    value: stringValue,
                    expires: now + (ttl * 1000),
                });
            }

            this.stats.sets++;
        } catch (error) {
            console.error('Cache set error:', error);
        }
    }

    /**
     * Generate semantic cache key
     */
    generateKey(userId, message, context = {}) {
        // Normalize message
        const normalized = message.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .trim();

        // Create key from user + normalized message + context
        const contextStr = JSON.stringify(context);
        return `chat:${userId}:${this.hash(normalized + contextStr)}`;
    }

    /**
     * Simple hash function
     */
    hash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Get cache stats
     */
    getStats() {
        const total = this.stats.hits + this.stats.misses;
        const hitRate = total > 0
            ? ((this.stats.hits / total) * 100).toFixed(2)
            : '0.00';

        return {
            hits: this.stats.hits,
            misses: this.stats.misses,
            sets: this.stats.sets,
            hitRate: hitRate + '%',
            backend: this.useRedis ? 'Redis' : 'In-Memory',
        };
    }

    /**
     * Clear cache (for testing)
     */
    async clear() {
        if (this.useRedis) {
            await this.client.flushdb();
        } else {
            this.cache.clear();
        }
    }
}

export default new ResponseCache();
