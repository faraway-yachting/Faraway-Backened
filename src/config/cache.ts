

// Simple in-memory cache implementation
// In production, you might want to use Redis
class InMemoryCache {
    private cache: Map<string, { value: any; expiry: number }> = new Map();

    set(key: string, value: any, ttlSeconds: number = 3600): void {
        const expiry = Date.now() + (ttlSeconds * 1000);
        this.cache.set(key, { value, expiry });
    }

    get(key: string): any {
        const item = this.cache.get(key);
        if (!item) return null;
        
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }
        
        return item.value;
    }

    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }

    size(): number {
        return this.cache.size;
    }
}

const cache = new InMemoryCache();

// Cache middleware
export const cacheMiddleware = (ttlSeconds: number = 300) => {
    return (req: any, res: any, next: any) => {
        const key = `cache:${req.originalUrl}`;
        const cached = cache.get(key);
        
        if (cached) {
            return res.json(cached);
        }
        
        // Store original send method
        const originalSend = res.json;
        
        // Override send method to cache response
        res.json = function(data: any) {
            cache.set(key, data, ttlSeconds);
            originalSend.call(this, data);
        };
        
        next();
    };
};

export default cache;
