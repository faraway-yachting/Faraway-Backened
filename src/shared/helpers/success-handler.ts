import { Response } from "express";
import { errorConstants } from "../utils/constants/index.js";

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

/**
 * 🔹 Error response structure
 */
export interface ErrorResponse extends BaseResponse {
  success: false;
  error?: string;
}

const SuccessHandler = <T>(
  res: Response,
  data: T | null,
  message: string,
  statusCode: number = 200
): Response<SuccessResponse<T>> => {
  // Validate status code for success responses
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(errorConstants.GENERAL.INTERNAL_SERVER_ERROR);
  }

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
