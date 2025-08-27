import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/helpers/api-error.js';

const requestValidator = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const { method, originalUrl } = req;
        if (originalUrl.startsWith('/uploads') || originalUrl === '/favicon.ico') {
            return next();
        }
        
        // For now, just pass through - validation will be handled by individual route validators
        console.log(`🔍 Request received: ${method} ${originalUrl}`);
        next();
    } catch (err: any) {
        console.error(`🔥 Uncaught validation middleware error: ${err.message}`);
        return next(
            new ApiError(403, err.message || 'Validation error')
        );
    }
};

export default requestValidator;
export { requestValidator };
