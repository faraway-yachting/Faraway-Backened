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
    static conflict(message = 'Conflict!'): ApiError {
        return new ApiError(409, message);
    }

    static wrongCredentials(message = 'Username or Password is wrong!'): ApiError {
        return new ApiError(401, message);
    }

    static unauthorized(message = 'Unauthorized Access'): ApiError {
        return new ApiError(401, message);
    }

    static notFound(message = 'Resource not found'): ApiError {
        return new ApiError(404, message);
    }

    static badRequest(message = 'Bad request'): ApiError {
        return new ApiError(400, message);
    }

    static forbidden(message = 'Forbidden'): ApiError {
        return new ApiError(403, message);
    }

    static internal(message = 'Internal server error'): ApiError {
        // ❌ not operational → unexpected bug
        return new ApiError(500, message, false);
    }
}
