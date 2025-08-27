import { type Request, type Response } from 'express';
import { logger } from '../utils/logger.js';
import { ApiError } from '../utils/helpers/api-error.js';

export const errorHandler = (
    err: any,
    req: Request,
    res: Response
): void => {
    let error = err;

    // If it's not an ApiError, convert it to one
    if (!(err instanceof ApiError)) {
        const statusCode = err.statusCode || err.status || 500;
        const message = err.message || 'Internal Server Error';
        error = new ApiError(statusCode, message, false);
    }

    // Log the error
    logger.error({
        message: error.message,
        statusCode: error.status,
        method: req.method,
        url: req.originalUrl,
        timestamp: new Date().toISOString(),
        stack: error.stack
    });

    // Send error response
    res.status(error.status).json({
        success: false,
        message: error.message,
        error: process.env['NODE_ENV'] === 'development' ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        path: req.originalUrl
    });
};

export default errorHandler;
