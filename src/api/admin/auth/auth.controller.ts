import { type Request, type Response, type NextFunction } from 'express';
import AuthService from './auth.service.js';
import successHandler from '@helpers/success-handler.js';
import { errorConstants } from '@utils/error.codes.js';
import { 
    LoginCredentials, 
    ForgotPasswordRequest, 
    VerifyOtpRequest, 
    ResetPasswordRequest,
    ResendOtpRequest
} from './auth.types.js';

// Extend Express Request interface for typed body
interface TypedRequestBody<T> extends Request {
    body: T;
}

class AuthController {
    
    async login(req: TypedRequestBody<LoginCredentials>, res: Response, next: NextFunction): Promise<void> {
        try {
            const { email, password } = req.body;
            const result = await AuthService.login(email, password);   
            successHandler(res, result, errorConstants.SUCCESS.ADMIN_LOGIN_SUCCESS);
        } catch (error) {
            next(error);
        }
    }

    async forgotPassword(req: TypedRequestBody<ForgotPasswordRequest>, res: Response, next: NextFunction): Promise<void> {
        try {
            const { email } = req.body;
            const result = await AuthService.forgotPassword(email);
            successHandler(res, result, errorConstants.SUCCESS.PASSWORD_RESET_OTP_SENT);
        } catch (error) {
            next(error);
        }
    }

    async verifyOtp(req: TypedRequestBody<VerifyOtpRequest>, res: Response, next: NextFunction): Promise<void> {
        try {
            const { email, otp } = req.body;
            const result = await AuthService.verifyOtp(email, otp);
            successHandler(res, result, errorConstants.SUCCESS.OTP_VERIFIED);
        } catch (error) {
            next(error);
        }
    }

    async resetPassword(req: TypedRequestBody<ResetPasswordRequest>, res: Response, next: NextFunction): Promise<void> {
        try {
            const { email, newPassword } = req.body;
            const result = await AuthService.resetPassword(email, newPassword);
            successHandler(res, result, errorConstants.SUCCESS.PASSWORD_RESET_SUCCESS);
        } catch (error) {
            next(error);
        }
    }

    async resendOtp(req: TypedRequestBody<ResendOtpRequest>, res: Response, next: NextFunction): Promise<void> {
        try {
            const { email } = req.body;
            const result = await AuthService.resendOtp(email);
            successHandler(res, result, errorConstants.SUCCESS.OTP_RESENT);
        } catch (error) {
            next(error);
        }
    }

    async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await AuthService.logout();
            res.clearCookie('adminToken');
            successHandler(res, result, errorConstants.SUCCESS.ADMIN_LOGOUT_SUCCESS);
        } catch (error) {
            next(error);
        }
    }
}

// Create single instance for performance (shared across requests)
const authController = new AuthController();

// Export bound methods with proper typing for optimal performance and type safety
export const login = (req: TypedRequestBody<LoginCredentials>, res: Response, next: NextFunction) => 
    authController.login.call(authController, req, res, next);

export const forgotPassword = (req: TypedRequestBody<ForgotPasswordRequest>, res: Response, next: NextFunction) => 
    authController.forgotPassword.call(authController, req, res, next);

export const verifyOtp = (req: TypedRequestBody<VerifyOtpRequest>, res: Response, next: NextFunction) => 
    authController.verifyOtp.call(authController, req, res, next);

export const resetPassword = (req: TypedRequestBody<ResetPasswordRequest>, res: Response, next: NextFunction) => 
    authController.resetPassword.call(authController, req, res, next);

export const resendOtp = (req: TypedRequestBody<ResendOtpRequest>, res: Response, next: NextFunction) => 
    authController.resendOtp.call(authController, req, res, next);

export const logout = (req: Request, res: Response, next: NextFunction) => 
    authController.logout.call(authController, req, res, next);
