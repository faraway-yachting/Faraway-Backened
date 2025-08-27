export class ApiError extends Error {
    public status: number;
    public isOperational: boolean;

    constructor(status: number, message: string, isOperational: boolean = true) {
        super(message);
        this.status = status;
        this.isOperational = isOperational;

        Error.captureStackTrace(this, this.constructor);
    }
}
