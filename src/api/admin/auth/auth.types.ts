// Auth-related types for admin authentication
export interface AuthResult {
    user: {
        id: string;
        email: string;
        otpVerified: boolean;
    };
    token: string;
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

export interface ResendOtpRequest {
    email: string;
}
