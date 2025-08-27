import { Response } from 'express';

export const successHandler = (
    res: Response,
    data: any,
    message: string = 'Success',
    statusCode: number = 200
): void => {
    res.status(statusCode).json({
        success: true,
        message,
        data,
        timestamp: new Date().toISOString(),
        path: res.req.originalUrl
    });
};

export default successHandler;
