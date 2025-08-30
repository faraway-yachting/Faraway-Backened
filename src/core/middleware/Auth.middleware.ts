import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../../shared/helpers/api-error.js';
import { errorConstants } from '../../shared/utils/error.codes.js';

export const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const token = req.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(
        ApiError.unauthorized(errorConstants.GENERAL.INVALID_TOKEN)
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || '') as any;

    req.user = decoded; // e.g. { _id: ..., email: ..., etc }
    next();
  } catch (err: any) {
    return next(
      ApiError.forbidden(
        err.message || errorConstants.GENERAL.INVALID_TOKEN
      )
    );
  }
};

export const authenticateToken = verifyToken;
export default { verifyToken, authenticateToken };
