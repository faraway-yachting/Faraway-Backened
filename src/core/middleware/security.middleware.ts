// Basic security middleware (without external dependencies)
import { Request, Response, NextFunction } from 'express';

// Basic security headers
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
    // Remove sensitive headers
    res.removeHeader('X-Powered-By');
    
    // Add basic security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    next();
};

// Basic rate limiting (simple implementation)
export const basicRateLimit = (req: Request, res: Response, next: NextFunction): void => {
    // Simple rate limiting logic can be added here
    next();
};

// Request size limit
export const requestSizeLimit = (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    
    if (contentLength > 10 * 1024 * 1024) { // 10MB limit
        res.status(413).json({
            success: false,
            message: 'Request entity too large'
        });
        return;
    }
    
    next();
};

// IP blocking (basic implementation)
export const ipBlocking = (req: Request, res: Response, next: NextFunction): void => {
    // Basic IP blocking logic can be added here
    next();
};

export default {
    securityHeaders,
    basicRateLimit,
    requestSizeLimit,
    ipBlocking
};
