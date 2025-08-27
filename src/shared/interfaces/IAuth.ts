export interface ILoginRequest {
    email: string;
    password: string;
}

export interface IRegisterRequest {
    name: string;
    email: string;
    password: string;
    phone: string;
}

export interface IAuthResponse {
    user: {
        id: string;
        name: string;
        email: string;
        role?: string;
    };
    token: string;
}

export interface IForgotPasswordRequest {
    email: string;
}

export interface IResetPasswordRequest {
    email: string;
    otp: string;
    newPassword: string;
}

export interface IOtpVerificationRequest {
    email: string;
    otp: string;
}
