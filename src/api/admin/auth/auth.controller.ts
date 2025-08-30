import { type Request, type Response, type NextFunction } from 'express';
import AuthService from './auth.service.js';
import successHandler from '@helpers/success-handler.js';
import { errorConstants } from '@utils/error.codes.js';

class AuthController {
    
    async login(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { email, password } = req.body;
            const result = await AuthService.login(email, password);   
            successHandler(res, result, errorConstants.SUCCESS.ADMIN_LOGIN_SUCCESS, 200);
        }
         catch (error) {
            next(error);
        }
    }

    async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { email } = req.body;
            const result = await AuthService.forgotPassword(email);
            successHandler(res, result, errorConstants.SUCCESS.PASSWORD_RESET_OTP_SENT, 200);
        } catch (error) {
            next(error);
        }
    }

    async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { email, otp } = req.body;
            const result = await AuthService.verifyOtp(email, otp);
            successHandler(res, result, errorConstants.SUCCESS.OTP_VERIFIED, 200);
        } catch (error) {
            next(error);
        }
    }

    async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { email, newPassword } = req.body;
            const result = await AuthService.resetPassword(email, newPassword);
            successHandler(res, result, errorConstants.SUCCESS.PASSWORD_RESET_SUCCESS, 200);
        } catch (error) {
            next(error);
        }
    }

    async resendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { email } = req.body;
            const result = await AuthService.resendOtp(email);
            successHandler(res, result, errorConstants.SUCCESS.OTP_RESENT, 200);
        } catch (error) {
            next(error);
        }
    }

    async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await AuthService.logout();
            (res as any).clearCookie('adminToken');
            successHandler(res, result, errorConstants.SUCCESS.ADMIN_LOGOUT_SUCCESS, 200);
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
