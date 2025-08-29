import { Response } from "express";

/**
 * 🔹 Base structure for all responses
 */
interface BaseResponse {
  success: boolean;
  statusCode: number;
  message: string;
  timestamp: string;
}

/**
 * 🔹 Success response with optional generic data
 */
export interface SuccessResponse<T> extends BaseResponse {
  success: true;
  data?: T;
}


const SuccessHandler = <T>(
  res: Response,
  data: T | null,
  message: string,
  statusCode: number = 200
): Response<SuccessResponse<T>> => {
  const response: SuccessResponse<T> = {
    success: true,
    statusCode,
    message,
    timestamp: new Date().toISOString(),
    ...(data !== null ? { data } : {}), // only include data if present
  };

  return res.status(statusCode).json(response);
};

export default SuccessHandler;
