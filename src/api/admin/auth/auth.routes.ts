import express from 'express';
import { 
    login, 
    forgotPassword, 
    verifyOtp, 
    resetPassword, 
    resendOtp,
    logout
} from './auth.controller.js';

const router = express.Router();

// Admin Authentication Routes
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);
router.post('/resend-otp', resendOtp);
router.post('/logout', logout);

export default router;
