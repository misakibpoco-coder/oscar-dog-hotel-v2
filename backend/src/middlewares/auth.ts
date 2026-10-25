import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { AppError } from '../errors/appError.js';
import { ErrorCodes } from '../errors/errorCodes.js';

export interface AuthenticatedStaff {
  sharedAccountId: string;
  email: string;
  displayName: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedStaff;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, ErrorCodes.AUTH_INVALID, 'Authentication token missing or invalid'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, config.jwt.secret) as {
      sub: string;
      email: string;
      displayName: string;
    };

    req.user = {
      sharedAccountId: payload.sub,
      email: payload.email,
      displayName: payload.displayName
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError(401, ErrorCodes.AUTH_TOKEN_EXPIRED, 'Authentication token expired'));
    }
    return next(new AppError(401, ErrorCodes.AUTH_INVALID, 'Invalid authentication token'));
  }
}
