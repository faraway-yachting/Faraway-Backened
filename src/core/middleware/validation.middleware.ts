import { Request, Response, NextFunction } from 'express';
import { errorConstants } from '../../shared/utils/constants/index.js';
import { ApiError } from '../../shared/helpers/api-error.js';

/**
 * 🔹 Validation middleware that uses error constants
 */
export const validateRequiredFields = (requiredFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const missingFields: string[] = [];
    
    requiredFields.forEach(field => {
      if (!req.body[field]) {
        missingFields.push(field);
      }
    });
    
    if (missingFields.length > 0) {
      const errorMessage = `Missing required fields: ${missingFields.join(', ')}`;
      return next(ApiError.badRequest(errorMessage));
    }
    
    next();
  };
};

/**
 * 🔹 Email validation middleware
 */
export const validateEmail = (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;
  
  if (!email) {
    return next(ApiError.badRequest(errorConstants.AUTHENTICATION.EMAIL_REQUIRED));
  }
  
  if (typeof email !== 'string') {
    return next(ApiError.badRequest(errorConstants.AUTHENTICATION.EMAIL_MUST_BE_STRING));
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(ApiError.badRequest(errorConstants.AUTHENTICATION.EMAIL_INVALID));
  }
  
  next();
};

/**
 * 🔹 Password validation middleware
 */
export const validatePassword = (req: Request, res: Response, next: NextFunction) => {
  const { password } = req.body;
  
  if (!password) {
    return next(ApiError.badRequest(errorConstants.AUTHENTICATION.PASSWORD_REQUIRED));
  }
  
  if (typeof password !== 'string') {
    return next(ApiError.badRequest(errorConstants.AUTHENTICATION.PASSWORD_MUST_BE_STRING));
  }
  
  if (password.length < 6) {
    return next(ApiError.badRequest(errorConstants.AUTHENTICATION.PASSWORD_MIN_LENGTH));
  }
  
  next();
};

export default {
  validateRequiredFields,
  validateEmail,
  validatePassword
};
