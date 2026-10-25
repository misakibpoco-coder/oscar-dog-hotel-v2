import rateLimit from 'express-rate-limit';
import { AppError } from '../errors/appError.js';
import { ErrorCodes } from '../errors/errorCodes.js';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  handler: (req, res, next) => {
    next(new AppError(429, ErrorCodes.RATE_LIMIT_EXCEEDED, 'Too many authentication attempts, please try again later'));
  }
});

export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  handler: (req, res, next) => {
    next(new AppError(429, ErrorCodes.RATE_LIMIT_EXCEEDED, 'API rate limit exceeded'));
  }
});
