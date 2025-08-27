import { type Request, type Response, type NextFunction } from 'express';
import AuthService from './auth.service.js';
import { successHandler } from '../../../core/utils/helpers/success-handler.js';

class AuthController {
    async login(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { email, password } = req.body;
            const result = await AuthService.login(email, password);
            successHandler(res, result, 'Login successful');
        } catch (error) {
            next(error);
        }
    }

    async register(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { name, email, password, phone } = req.body;
            const result = await AuthService.register({ name, email, password, phone });
            successHandler(res, result, 'Registration successful');
        } catch (error) {
            next(error);
        }
    }

    async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { email } = req.body;
            const result = await AuthService.forgotPassword(email);
            successHandler(res, result, 'Password reset email sent');
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
            const { email, otp, newPassword } = req.body;
            const result = await AuthService.resetPassword(email, otp, newPassword);
            successHandler(res, result, 'Password reset successful');
        } catch (error) {
            next(error);
        }
    }

    async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await AuthService.logout();
            res.clearCookie('token');
            successHandler(res, result, 'Logout successful');
        } catch (error) {
            next(error);
        }
    }
}

const authController = new AuthController();

export const login = authController.login.bind(authController);
export const register = authController.register.bind(authController);
export const forgotPassword = authController.forgotPassword.bind(authController);
export const verifyOtp = authController.verifyOtp.bind(authController);
export const resetPassword = authController.resetPassword.bind(authController);
export const logout = authController.logout.bind(authController);

export default authController;
