

// Simple in-memory rate limiting
// In production, you might want to use Redis for distributed rate limiting
class RateLimiter {
    private requests: Map<string, { count: number; resetTime: number }> = new Map();
    private windowMs: number;
    private maxRequests: number;

    constructor(windowMs: number = 15 * 60 * 1000, maxRequests: number = 100) {
        this.windowMs = windowMs;
        this.maxRequests = maxRequests;
    }

    isAllowed(identifier: string): boolean {
        const now = Date.now();
        const request = this.requests.get(identifier);

        if (!request || now > request.resetTime) {
            // Reset or create new window
            this.requests.set(identifier, {
                count: 1,
                resetTime: now + this.windowMs
            });
            return true;
        }

        if (request.count >= this.maxRequests) {
            return false;
        }

        request.count++;
        return true;
    }

    getRemaining(identifier: string): number {
        const request = this.requests.get(identifier);
        if (!request) return this.maxRequests;
        return Math.max(0, this.maxRequests - request.count);
    }

    getResetTime(identifier: string): number {
        const request = this.requests.get(identifier);
        return request ? request.resetTime : Date.now() + this.windowMs;
    }
}

const rateLimiter = new RateLimiter();

// Rate limiting middleware
export const rateLimitMiddleware = (windowMs: number = 15 * 60 * 1000, maxRequests: number = 100) => {
    const limiter = new RateLimiter(windowMs, maxRequests);
    
    return (req: any, res: any, next: any) => {
        const identifier = req.ip || req.connection.remoteAddress || 'unknown';
        
        if (!limiter.isAllowed(identifier)) {
            const resetTime = limiter.getResetTime(identifier);
            const remaining = limiter.getRemaining(identifier);
            
            res.set({
                'X-RateLimit-Limit': maxRequests,
                'X-RateLimit-Remaining': remaining,
                'X-RateLimit-Reset': resetTime
            });
            
            return res.status(429).json({
                success: false,
                message: 'Too many requests, please try again later',
                retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
            });
        }
        
        res.set({
            'X-RateLimit-Limit': maxRequests,
            'X-RateLimit-Remaining': limiter.getRemaining(identifier),
            'X-RateLimit-Reset': limiter.getResetTime(identifier)
        });
        
        next();
    };
};

export default rateLimiter;
