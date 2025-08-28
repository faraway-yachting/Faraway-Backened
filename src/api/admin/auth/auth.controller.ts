import { type Request, type Response, type NextFunction } from 'express';
import AuthService from './auth.service.js';
import { successHandler } from '../../../core/utils/helpers/success-handler.js';

class AuthController {
    async login(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { email, password } = req.body;
            const result = await AuthService.login(email, password);
            
            // Set JWT as HTTP-only cookie
            (res as any).cookie('adminToken', result.token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            });
            
            successHandler(res, result, 'Admin login successful');
        } catch (error) {
            next(error);
        }
    }

    async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { email } = req.body;
            const result = await AuthService.forgotPassword(email);
            successHandler(res, result, 'Password reset OTP sent to admin email');
        } catch (error) {
            next(error);
        }
    }

    async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { email, otp } = req.body;
            const result = await AuthService.verifyOtp(email, otp);
            successHandler(res, result, 'OTP verified successfully');
        } catch (error) {
            next(error);
        }
    }

    async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { email, newPassword } = req.body;
            const result = await AuthService.resetPassword(email, newPassword);
            successHandler(res, result, 'Admin password reset successfully');
        } catch (error) {
            next(error);
        }
    }

    async resendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { email } = req.body;
            const result = await AuthService.resendOtp(email);
            successHandler(res, result, 'OTP resent to admin email');
        } catch (error) {
            next(error);
        }
    }

    async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await AuthService.logout();
            (res as any).clearCookie('adminToken');
            successHandler(res, result, 'Admin logged out successfully');
        } catch (error) {
            next(error);
        }
    }
}

const authController = new AuthController();

export const login = authController.login.bind(authController);
export const forgotPassword = authController.forgotPassword.bind(authController);
export const verifyOtp = authController.verifyOtp.bind(authController);
export const resetPassword = authController.resetPassword.bind(authController);
export const resendOtp = authController.resendOtp.bind(authController);
export const logout = authController.logout.bind(authController);

export default authController;
