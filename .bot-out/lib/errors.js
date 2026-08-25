"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toErrorResponse = exports.ConfigError = exports.DiscordError = exports.DatabaseError = exports.RateLimitError = exports.NotFoundError = exports.PermissionError = exports.ValidationError = exports.AuthError = exports.AppError = void 0;
class AppError extends Error {
    constructor(code, safeMessage, statusCode, internalMessage, metadata) {
        super(internalMessage || safeMessage);
        this.name = 'AppError';
        this.code = code;
        this.statusCode = statusCode;
        this.safeMessage = safeMessage;
        this.metadata = metadata;
    }
}
exports.AppError = AppError;
class AuthError extends AppError {
    constructor(safeMessage, internalMessage) {
        super('AUTH_FAILED', safeMessage, 401, internalMessage);
        this.name = 'AuthError';
    }
}
exports.AuthError = AuthError;
class ValidationError extends AppError {
    constructor(safeMessage, internalMessage) {
        super('VALIDATION_ERROR', safeMessage, 400, internalMessage);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class PermissionError extends AppError {
    constructor(safeMessage = 'You do not have permission to do this.', internalMessage) {
        super('FORBIDDEN', safeMessage, 403, internalMessage);
        this.name = 'PermissionError';
    }
}
exports.PermissionError = PermissionError;
class NotFoundError extends AppError {
    constructor(safeMessage = 'Not found.', internalMessage) {
        super('NOT_FOUND', safeMessage, 404, internalMessage);
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class RateLimitError extends AppError {
    constructor(retryAfter) {
        super('RATE_LIMITED', 'Too many requests. Please try again later.', 429, undefined, { retryAfter });
        this.name = 'RateLimitError';
    }
}
exports.RateLimitError = RateLimitError;
class DatabaseError extends AppError {
    constructor(internalMessage) {
        super('DATABASE_UNAVAILABLE', 'We could not connect to the database. Please try again.', 503, internalMessage);
        this.name = 'DatabaseError';
    }
}
exports.DatabaseError = DatabaseError;
class DiscordError extends AppError {
    constructor(internalMessage) {
        super('DISCORD_UNAVAILABLE', 'Discord is unavailable right now. Please try again.', 502, internalMessage);
        this.name = 'DiscordError';
    }
}
exports.DiscordError = DiscordError;
class ConfigError extends AppError {
    constructor(internalMessage) {
        super('CONFIGURATION_ERROR', 'This application is not properly configured. Contact the administrator.', 503, internalMessage);
        this.name = 'ConfigError';
    }
}
exports.ConfigError = ConfigError;
function toErrorResponse(error) {
    if (error instanceof AppError) {
        return { code: error.code, message: error.safeMessage, status: error.statusCode };
    }
    return { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.', status: 500 };
}
exports.toErrorResponse = toErrorResponse;
