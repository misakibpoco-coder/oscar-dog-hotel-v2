import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/appError.js';
import { ErrorCodes, ErrorCode } from '../errors/errorCodes.js';
import { config } from '../config/index.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  let statusCode = 500;
  let errorCode: ErrorCode = ErrorCodes.INTERNAL_SERVER_ERROR;
  let message = 'An unexpected server error occurred';
  let details: any = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorCode = err.code;
    message = err.message;
    details = err.details;
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    errorCode = ErrorCodes.INVALID_JSON;
    message = 'Invalid JSON request payload';
  } else if (err.code === '23505') {
    // Postgres unique_violation
    statusCode = 409;
    errorCode = ErrorCodes.VALIDATION_ERROR;
    message = 'A record with this unique identifier already exists';
  } else if (err.code === '23503') {
    // Postgres foreign_key_violation
    statusCode = 400;
    errorCode = ErrorCodes.VALIDATION_ERROR;
    message = 'Referenced entity does not exist';
  } else {
    // Log unexpected errors
    console.error('[UNHANDLED ERROR]', err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      ...(details ? { details } : {}),
      ...(config.nodeEnv === 'development' && !(err instanceof AppError)
        ? { stack: err.stack }
        : {})
    }
  });
}
