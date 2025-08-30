// Auth-related types for admin authentication
export interface AuthResult {
    user: {
        id: string;
        email: string;
        otpVerified: boolean;
    };
    token: string;
}

export interface AdminUser {
    id: string;
    email: string;
    password: string;
    otpVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface ForgotPasswordRequest {
    email: string;
}

export interface VerifyOtpRequest {
    email: string;
    otp: string;
}

export interface ResetPasswordRequest {
    email: string;
    newPassword: string;
}
