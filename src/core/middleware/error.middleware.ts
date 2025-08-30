import { Request, Response } from 'express';
import { logger } from '@utils/logger.js';
import { ApiError } from '@helpers/api-error.js';
import { errorConstants } from '@utils/error.codes.js';
import environment from '@config/environment.js';

// 🌍 detect environment
const isDev = environment.NODE_ENV === 'development';

export const errorHandler = (
    err: unknown,   
    req: Request,
    res: Response,
    _next: unknown // eslint-disable-line @typescript-eslint/no-unused-vars
): void => {
    let error: ApiError;

    if (err instanceof ApiError) {
        error = err;
    } else if (err instanceof Error) {
        const statusCode = (err as { statusCode?: number }).statusCode || 500; 
        error = new ApiError(statusCode, err.message, false);
    } else {
        error = ApiError.internal(errorConstants.GENERAL.INTERNAL_SERVER_ERROR);
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
                : errorConstants.GENERAL.SOMETHING_WENT_WRONG,
        
        timestamp: new Date().toISOString(),
        path: req.originalUrl
    };

    res.status(error.status).json(response);
};

export default errorHandler;
