import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validateLogin = (req: Request, res: Response, next: NextFunction): void => {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required()
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

export const validateRegister = (req: Request, res: Response, next: NextFunction): void => {
    const schema = Joi.object({
        name: Joi.string().min(2).max(50).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
        phone: Joi.string().pattern(/^\+?[\d\s-]+$/).required()
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

export const validateForgotPassword = (req: Request, res: Response, next: NextFunction): void => {
    const schema = Joi.object({
        email: Joi.string().email().required()
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

export const validateOtp = (req: Request, res: Response, next: NextFunction): void => {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        otp: Joi.string().length(6).pattern(/^\d+$/).required()
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

export const validateResetPassword = (req: Request, res: Response, next: NextFunction): void => {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        otp: Joi.string().length(6).pattern(/^\d+$/).required(),
        newPassword: Joi.string().min(6).required()
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
