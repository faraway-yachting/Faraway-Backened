import { Router } from 'express';
import { login, register, forgotPassword, resetPassword, logout, verifyOtp } from './auth.controller.js';
import { validateLogin, validateRegister, validateForgotPassword, validateResetPassword, validateOtp } from '../../../core/validators/auth.validation.js';
import { authenticateToken } from '../../../core/middleware/Auth.middleware.js';

const router = Router();

// Public routes
router.post('/login', validateLogin, login);
router.post('/register', validateRegister, register);
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.post('/verify-otp', validateOtp, verifyOtp);
router.post('/reset-password', validateResetPassword, resetPassword);

// Protected routes
router.post('/logout', authenticateToken, logout);

export default router;
