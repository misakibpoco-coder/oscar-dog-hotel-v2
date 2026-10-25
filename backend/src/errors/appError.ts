import { ErrorCode, ErrorCodes } from './errorCodes.js';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: any;
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    details?: any
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, code: ErrorCode = ErrorCodes.VALIDATION_ERROR, details?: any) {
    return new AppError(400, code, message, details);
  }

  static unauthorized(message: string = 'Invalid credentials or expired token', code: ErrorCode = ErrorCodes.AUTH_INVALID) {
    return new AppError(401, code, message);
  }

  static forbidden(message: string = 'Access forbidden', code: ErrorCode = ErrorCodes.AUTH_FORBIDDEN) {
    return new AppError(403, code, message);
  }

  static notFound(message: string, code: ErrorCode = ErrorCodes.VALIDATION_ERROR) {
    return new AppError(404, code, message);
  }

  static conflict(message: string, code: ErrorCode, details?: any) {
    return new AppError(409, code, message, details);
  }

  static internal(message: string = 'An unexpected internal error occurred') {
    return new AppError(500, ErrorCodes.INTERNAL_SERVER_ERROR, message);
  }
}
