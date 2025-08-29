import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../../shared/helpers/api-error.js';

export const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const token = req.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(
        new ApiError(401, 'Token missing')
      );
    }

    const decoded = jwt.verify(token, process.env['JWT_SECRET']!) as any;

    req.user = decoded; // e.g. { _id: ..., email: ..., etc }
    next();
  } catch (err: any) {
    return next(
      new ApiError(
        403,
        err.message || 'Invalid token'
      )
    );
  }
};

export const authenticateToken = verifyToken;
export default { verifyToken, authenticateToken };
