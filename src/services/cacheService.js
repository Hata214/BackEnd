const redis = require('redis');
const mcache = require('memory-cache');

class CacheService {
    constructor() {
        // Khởi tạo Redis client nếu có cấu hình
        if (process.env.REDIS_URL) {
            this.redisClient = redis.createClient({
                url: process.env.REDIS_URL,
                socket: {
                    reconnectStrategy: (retries) => {
                        if (retries > 10) {
                            console.warn('Redis connection failed, switching to memory cache');
                            return new Error('Redis connection failed');
                        }
                        return Math.min(retries * 100, 3000);
                    }
                }
            });

            this.redisClient.on('error', (err) => {
                console.error('Redis Client Error:', err);
            });

            this.redisClient.on('connect', () => {
                console.log('Redis Client Connected');
            });

            this.redisClient.connect().catch(console.error);
        }

        // Fallback to memory cache
        this.memoryCache = new mcache.Cache();
        this.defaultTTL = 3600; // 1 hour in seconds
    }

    // Cache middleware cho routes
    cacheMiddleware(duration = 300) { // 5 minutes default
        return async (req, res, next) => {
            const key = `__express__${req.originalUrl || req.url}`;
            const cachedResponse = await this.get(key);

            if (cachedResponse) {
                return res.json(JSON.parse(cachedResponse));
            }

            res.sendResponse = res.json;
            res.json = (body) => {
                this.set(key, JSON.stringify(body), duration);
                res.sendResponse(body);
            };
            next();
        };
    }

    // Lấy data từ cache
    async get(key) {
        try {
            if (this.redisClient?.isReady) {
                return await this.redisClient.get(key);
            }
            return this.memoryCache.get(key);
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }

    // Lưu data vào cache
    async set(key, value, duration = this.defaultTTL) {
        try {
            if (this.redisClient?.isReady) {
                await this.redisClient.setEx(key, duration, value);
            } else {
                this.memoryCache.put(key, value, duration * 1000);
            }
        } catch (error) {
            console.error('Cache set error:', error);
        }
    }

    // Xóa key khỏi cache
    async del(key) {
        try {
            if (this.redisClient?.isReady) {
                await this.redisClient.del(key);
            } else {
                this.memoryCache.del(key);
            }
        } catch (error) {
            console.error('Cache delete error:', error);
        }
    }

    // Xóa cache theo pattern
    async delByPattern(pattern) {
        try {
            if (this.redisClient?.isReady) {
                const keys = await this.redisClient.keys(pattern);
                if (keys.length > 0) {
                    await this.redisClient.del(keys);
                }
            } else {
                const keys = this.memoryCache.keys();
                keys.forEach(key => {
                    if (key.match(pattern)) {
                        this.memoryCache.del(key);
                    }
                });
            }
        } catch (error) {
            console.error('Cache delete by pattern error:', error);
        }
    }

    // Clear toàn bộ cache
    async clear() {
        try {
            if (this.redisClient?.isReady) {
                await this.redisClient.flushAll();
            } else {
                this.memoryCache.clear();
            }
        } catch (error) {
            console.error('Cache clear error:', error);
        }
    }
}

module.exports = new CacheService(); 