import { Response } from 'express';

interface SuccessResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

export const successHandler = <T>(
    res: Response,
    data: T,
    message: string,
    pagination?: SuccessResponse<T>['pagination'],
    statusCode: number = 200
): void => {
    const response: SuccessResponse<T> = {
        success: true,
        message
    };

    if (data !== undefined) {
        response.data = data;
    }

    if (pagination) {
        response.pagination = pagination;
    }

    res.status(statusCode).json(response);
};

export default successHandler;
