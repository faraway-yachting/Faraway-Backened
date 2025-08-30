import { errorConstants } from '../utils/constants/index.js';

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
        return new ApiError(409, message || errorConstants.GENERAL.VALIDATION_ERROR);
    }

    static wrongCredentials(message?: string): ApiError {
        return new ApiError(401, message || errorConstants.AUTHENTICATION.INVALID_CREDENTIALS);
    }

    static unauthorized(message?: string): ApiError {
        return new ApiError(401, message || errorConstants.GENERAL.UNAUTHORIZED);
    }

    static notFound(message?: string): ApiError {
        return new ApiError(404, message || errorConstants.DATABASE.RECORD_NOT_FOUND);
    }

    static badRequest(message?: string): ApiError {
        return new ApiError(400, message || errorConstants.GENERAL.VALIDATION_ERROR);
    }

    static forbidden(message?: string): ApiError {
        return new ApiError(403, message || errorConstants.GENERAL.UNAUTHORIZED);
    }

    static internal(message?: string): ApiError {
        // ❌ not operational → unexpected bug
        return new ApiError(500, message || errorConstants.GENERAL.INTERNAL_SERVER_ERROR, false);
    }
}
