import { logger } from '../logger.js';

interface CacheItem<T> {
    value: T;
    expiry: number;
}

class CacheService {
    private cache: Map<string, CacheItem<any>> = new Map();
    private defaultTTL: number = 5 * 60 * 1000; // 5 minutes

    set<T>(key: string, value: T, ttl: number = this.defaultTTL): void {
        const expiry = Date.now() + ttl;
        this.cache.set(key, { value, expiry });
        logger.debug(`Cache set: ${key}, expires: ${new Date(expiry).toISOString()}`);
    }

    get<T>(key: string): T | null {
        const item = this.cache.get(key);
        
        if (!item) {
            return null;
        }

        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            logger.debug(`Cache expired: ${key}`);
            return null;
        }

        logger.debug(`Cache hit: ${key}`);
        return item.value;
    }

    delete(key: string): boolean {
        const deleted = this.cache.delete(key);
        if (deleted) {
            logger.debug(`Cache deleted: ${key}`);
        }
        return deleted;
    }

    clear(): void {
        this.cache.clear();
        logger.debug('Cache cleared');
    }

    has(key: string): boolean {
        const item = this.cache.get(key);
        if (!item) return false;
        
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return false;
        }
        
        return true;
    }

    // Get cache statistics
    getStats(): { size: number; keys: string[] } {
        const keys = Array.from(this.cache.keys());
        return {
            size: keys.length,
            keys
        };
    }
}

export const cacheService = new CacheService();
export default cacheService;
