export type ApiResponse<T = any> = {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
    timestamp: string;
    path: string;
};

export type PaginatedResponse<T> = ApiResponse<T[]> & {
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
};

export type ErrorResponse = {
    success: false;
    message: string;
    error: string;
    timestamp: string;
    path: string;
    code?: string;
};
