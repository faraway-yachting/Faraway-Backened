import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../../shared/helpers/api-error.js';
import { validationSchemas } from '../validators/index.js';
import { errorConstants } from '../../shared/utils/error.codes.js';
import { logger } from '../../shared/utils/logger.js';

const requestValidator = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const { method, originalUrl, body } = req;
        
        // Skip validation for static files
        if (originalUrl.startsWith('/uploads') || originalUrl === '/favicon.ico') {
            return next();
        }
        
        const fullURL = originalUrl.split('?')[0];
        logger.info(`🔍 Validating request: ${method} ${fullURL}`);

        // Strip /api prefix and leading slash for route matching
        const routePath = fullURL.startsWith('/api') ? fullURL.substring(4) : fullURL;
        const cleanRoutePath = routePath.startsWith('/') ? routePath.substring(1) : routePath;
        
        logger.debug(`Route path: ${cleanRoutePath}`);

        // Find matching route using exact string matching
        const matchedRoute = Object.keys(validationSchemas).find((route) => {
            return cleanRoutePath === route;
        });

        if (!matchedRoute) {
            logger.warn(`No validation schema route matched for: ${cleanRoutePath}`);
            return next(ApiError.badRequest(errorConstants.ROUTE_ERRORS.INVALID_ROUTE));
        }

        const routeSchemas = validationSchemas[matchedRoute as keyof typeof validationSchemas];
        if (!routeSchemas) {
            logger.warn(`Route "${matchedRoute}" found but no method-based schema exists`);
            return next(ApiError.badRequest(errorConstants.ROUTE_ERRORS.INVALID_METHOD));
        }

        const schema = routeSchemas[method as keyof typeof routeSchemas];
        if (schema === null || !schema) {
            logger.debug(`Validation skipped for ${method} ${matchedRoute}`);
            return next();
        }

        if (req.is('multipart/form-data')) {
            logger.debug(`Skipping validation for multipart/form-data`);
            return next();
        }

        const { error } = schema.validate(body, { abortEarly: false });

        if (error) {
            logger.error(`Joi validation error in route ${method} ${matchedRoute}:`);
            error.details.forEach((detail: any) => {
                logger.error(`  - ${detail.path.join('.')}: ${detail.message}`);
            });

            return next(ApiError.badRequest(error.details[0].message));
        }

        logger.debug(`Request body passed validation for ${method} ${matchedRoute}`);
        next();
    } catch (err: any) {
        logger.error(`Uncaught validation middleware error: ${err.message}`);
        return next(
            ApiError.forbidden(err.message || errorConstants.GENERAL.VALIDATION_ERROR)
        );
    }
};

export default requestValidator;
export { requestValidator };
