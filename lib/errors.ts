export type ErrorCode =
  | 'AUTH_FAILED'
  | 'OAUTH_STATE_INVALID'
  | 'OAUTH_STATE_EXPIRED'
  | 'DISCORD_UNAVAILABLE'
  | 'DATABASE_UNAVAILABLE'
  | 'SESSION_CREATION_FAILED'
  | 'SESSION_INVALID'
  | 'SESSION_EXPIRED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'CONFIGURATION_ERROR'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly safeMessage: string;
  public readonly metadata?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    safeMessage: string,
    statusCode: number,
    internalMessage?: string,
    metadata?: Record<string, unknown>,
  ) {
    super(internalMessage || safeMessage);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.safeMessage = safeMessage;
    this.metadata = metadata;
  }
}

export class AuthError extends AppError {
  constructor(safeMessage: string, internalMessage?: string) {
    super('AUTH_FAILED', safeMessage, 401, internalMessage);
    this.name = 'AuthError';
  }
}

export class ValidationError extends AppError {
  constructor(safeMessage: string, internalMessage?: string) {
    super('VALIDATION_ERROR', safeMessage, 400, internalMessage);
    this.name = 'ValidationError';
  }
}

export class PermissionError extends AppError {
  constructor(safeMessage: string = 'You do not have permission to do this.', internalMessage?: string) {
    super('FORBIDDEN', safeMessage, 403, internalMessage);
    this.name = 'PermissionError';
  }
}

export class NotFoundError extends AppError {
  constructor(safeMessage: string = 'Not found.', internalMessage?: string) {
    super('NOT_FOUND', safeMessage, 404, internalMessage);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super('RATE_LIMITED', 'Too many requests. Please try again later.', 429, undefined, { retryAfter });
    this.name = 'RateLimitError';
  }
}

export class DatabaseError extends AppError {
  constructor(internalMessage?: string) {
    super('DATABASE_UNAVAILABLE', 'We could not connect to the database. Please try again.', 503, internalMessage);
    this.name = 'DatabaseError';
  }
}

export class DiscordError extends AppError {
  constructor(internalMessage?: string) {
    super('DISCORD_UNAVAILABLE', 'Discord is unavailable right now. Please try again.', 502, internalMessage);
    this.name = 'DiscordError';
  }
}

export class ConfigError extends AppError {
  constructor(internalMessage?: string) {
    super('CONFIGURATION_ERROR', 'This application is not properly configured. Contact the administrator.', 503, internalMessage);
    this.name = 'ConfigError';
  }
}

export function toErrorResponse(error: unknown): { code: string; message: string; status: number } {
  if (error instanceof AppError) {
    return { code: error.code, message: error.safeMessage, status: error.statusCode };
  }
  return { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.', status: 500 };
}
