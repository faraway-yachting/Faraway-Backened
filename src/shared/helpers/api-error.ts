import { errorConstants } from '@utils/error.codes.js';
import { STATUS_CODES } from '@utils/status.codes.js';

export class ApiError extends Error {
    public status: number;
    public isOperational: boolean;

    constructor(status: number, message: string, isOperational: boolean = true) {
        super(message);

        this.status = status;
        this.isOperational = isOperational;

        // Maintains proper stack trace (V8 engines)
        Error.captureStackTrace(this, this.constructor);
    }

    // ✅ Static helpers for common cases
    static conflict(message?: string): ApiError {
        return new ApiError(STATUS_CODES.CONFLICT, message || errorConstants.GENERAL.VALIDATION_ERROR);
    }

    static wrongCredentials(message?: string): ApiError {
        return new ApiError(STATUS_CODES.UNAUTHORIZED, message || errorConstants.AUTHENTICATION.INVALID_CREDENTIALS);
    }

    static unauthorized(message?: string): ApiError {
        return new ApiError(STATUS_CODES.UNAUTHORIZED, message || errorConstants.GENERAL.UNAUTHORIZED);
    }

    static notFound(message?: string): ApiError {
        return new ApiError(STATUS_CODES.NOT_FOUND, message || errorConstants.DATABASE.RECORD_NOT_FOUND);
    }

    static badRequest(message?: string): ApiError {
        return new ApiError(STATUS_CODES.BAD_REQUEST, message || errorConstants.GENERAL.VALIDATION_ERROR);
    }

    static forbidden(message?: string): ApiError {
        return new ApiError(STATUS_CODES.FORBIDDEN, message || errorConstants.GENERAL.UNAUTHORIZED);
    }

    static internal(message?: string): ApiError {
        // ❌ not operational → unexpected bug
        return new ApiError(STATUS_CODES.INTERNAL_SERVER_ERROR, message || errorConstants.GENERAL.INTERNAL_SERVER_ERROR, false);
    }
}
