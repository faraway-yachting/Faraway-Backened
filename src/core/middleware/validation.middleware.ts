import { Request, Response, NextFunction } from 'express';
import { Schema } from 'joi';
import { ApiError } from '../../shared/helpers/api-error.js';

export const validateRequest = (schema: Schema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const { error } = schema.validate(req.body);
        
        if (error) {
            const errorMessage = error.details.map(detail => detail.message).join(', ');
            return next(new ApiError(400, `Validation error: ${errorMessage}`));
        }
        
        next();
    };
};

export const validateQuery = (schema: Schema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const { error } = schema.validate(req.query);
        
        if (error) {
            const errorMessage = error.details.map(detail => detail.message).join(', ');
            return next(new ApiError(400, `Query validation error: ${errorMessage}`));
        }
        
        next();
    };
};

export const validateParams = (schema: Schema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const { error } = schema.validate(req.params);
        
        if (error) {
            const errorMessage = error.details.map(detail => detail.message).join(', ');
            return next(new ApiError(400, `Parameter validation error: ${errorMessage}`));
        }
        
        next();
    };
};

export default { validateRequest, validateQuery, validateParams };
