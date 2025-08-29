import { Request, Response } from 'express';
import { logger } from '../../shared/utils/logger.js';
import { ApiError } from '../../shared/helpers/api-error.js';
import environment from '../../config/environment.js';

// 🌍 detect environment
const isDev = environment.NODE_ENV === 'development';

export const errorHandler = (
    err: unknown,   
    req: Request,
    res: Response,
    _next: any // eslint-disable-line @typescript-eslint/no-unused-vars
): void => {
    let error: ApiError;

    if (err instanceof ApiError) {
        error = err;
    } else if (err instanceof Error) {
        const statusCode = (err as any).statusCode || 500; // optional narrowing
        error = new ApiError(statusCode, err.message, false);
    } else {
        error = ApiError.internal('Unexpected error');
    }

    // 📝 Log details always
    logger.error({
        message: error.message,
        statusCode: error.status,
        method: req.method,
        url: req.originalUrl,
        timestamp: new Date().toISOString(),
        stack: error.stack
    });

    // 🎯 Response
    const response = {
        success: false,
        statusCode: error.status,
        message:
            error.isOperational || isDev
                ? error.message
                : 'Something went wrong, please try again later',
        
        timestamp: new Date().toISOString(),
        path: req.originalUrl
    };

    res.status(error.status).json(response);
};

export default errorHandler;
