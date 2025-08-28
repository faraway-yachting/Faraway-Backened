// User Authentication Interfaces
export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
}

export interface AuthResponse {
    user: {
        id: string;
        email: string;
        otpVerified: boolean;
    };
    token: string;
}

export interface ForgotPasswordRequest {
    email: string;
}

export interface ResetPasswordRequest {
    email: string;
    otp: string;
    newPassword: string;
}

export interface OtpVerificationRequest {
    email: string;
    otp: string;
}

// User Response Interface (without password)
export interface UserResponse {
    _id: string;
    email: string;
    otpVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// User Create Interface
export interface CreateUser {
    email: string;
    password: string;
}
