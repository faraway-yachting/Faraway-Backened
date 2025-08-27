import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validateCreateBlog = (req: Request, res: Response, next: NextFunction): void => {
    const schema = Joi.object({
        title: Joi.string().min(5).max(200).required(),
        content: Joi.string().min(50).max(5000).required(),
        category: Joi.string().valid('travel', 'lifestyle', 'yachting', 'destination').required(),
        author: Joi.string().required(),
        tags: Joi.array().items(Joi.string()).optional(),
        image: Joi.string().uri().optional()
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

export const validateUpdateBlog = (req: Request, res: Response, next: NextFunction): void => {
    const schema = Joi.object({
        title: Joi.string().min(5).max(200).optional(),
        content: Joi.string().min(50).max(5000).optional(),
        category: Joi.string().valid('travel', 'lifestyle', 'yachting', 'destination').optional(),
        author: Joi.string().optional(),
        tags: Joi.array().items(Joi.string()).optional(),
        image: Joi.string().uri().optional()
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
