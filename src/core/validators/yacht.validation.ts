import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validateCreateYacht = (req: Request, res: Response, next: NextFunction): void => {
    const schema = Joi.object({
        name: Joi.string().min(2).max(100).required(),
        description: Joi.string().min(10).max(1000).required(),
        type: Joi.string().valid('motor', 'sailing', 'catamaran', 'luxury').required(),
        length: Joi.number().positive().required(),
        capacity: Joi.number().integer().min(1).required(),
        price: Joi.number().positive().required(),
        location: Joi.string().required(),
        amenities: Joi.array().items(Joi.string()).optional(),
        images: Joi.array().items(Joi.string().uri()).optional()
    });

    const { error } = schema.validate(req.body);
    if (error?.details?.[0]?.message) {
        res.status(400).json({
            success: false,
            message: error.details[0].message
        });
        return;
    }
    next();
};

export const validateUpdateYacht = (req: Request, res: Response, next: NextFunction): void => {
    const schema = Joi.object({
        name: Joi.string().min(2).max(100).optional(),
        description: Joi.string().min(10).max(1000).optional(),
        type: Joi.string().valid('motor', 'sailing', 'catamaran', 'luxury').optional(),
        length: Joi.number().positive().optional(),
        capacity: Joi.number().integer().min(1).optional(),
        price: Joi.number().positive().optional(),
        location: Joi.string().optional(),
        amenities: Joi.array().items(Joi.string()).optional(),
        images: Joi.array().items(Joi.string().uri()).optional()
    });

    const { error } = schema.validate(req.body);
    if (error?.details?.[0]?.message) {
        res.status(400).json({
            success: false,
            message: error.details[0].message
        });
        return;
    }
    next();
};
