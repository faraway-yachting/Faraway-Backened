import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@helpers/api-error.js';
import { validationSchemas } from '@validators/index.js';
import { errorConstants } from '@utils/error.codes.js';
import { logger } from '@utils/logger.js';

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

        // Find matching route using pattern matching for parameterized routes
        const matchedRoute = Object.keys(validationSchemas).find((route) => {
            // If route has parameters (contains :), use pattern matching
            if (route.includes(':')) {
                // Convert route pattern to regex
                const routePattern = route.replace(/:[^/]+/g, '[^/]+');
                const routeRegex = new RegExp(`^${routePattern}$`);
                return routeRegex.test(cleanRoutePath);
            }
            // Otherwise use exact matching
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

        const { error } = (schema as any).validate(body, { abortEarly: false });

        if (error) {
            logger.error(`Joi validation error in route ${method} ${matchedRoute}:`);
            error.details.forEach((detail: { path: string[]; message: string }) => {
                logger.error(`  - ${detail.path.join('.')}: ${detail.message}`);
            });

            return next(ApiError.badRequest(error.details[0].message));
        }

        logger.debug(`Request body passed validation for ${method} ${matchedRoute}`);
        next();
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown validation error';
        logger.error(`Uncaught validation middleware error: ${errorMessage}`);
        return next(
            ApiError.forbidden(errorMessage || errorConstants.GENERAL.VALIDATION_ERROR)
        );
    }
};

export default requestValidator;
export { requestValidator };
