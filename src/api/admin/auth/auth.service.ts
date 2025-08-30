import User from '../../../core/models/user.js';
import { generateToken } from '../../../shared/helpers/jwt.js';
import { generateOTP, hashOTP, storeOTP, getStoredOTP, verifyOTP, clearOTP } from '../../../shared/helpers/otp.js';
import { sendEmail } from '../../../shared/services/sendEmail.js';
import { processTemplate } from '../../../shared/helpers/processTemplate.js';
import { ApiError } from '../../../shared/helpers/api-error.js';
import { errorConstants } from '../../../shared/utils/constants/index.js';
import { logger } from '../../../shared/utils/logger.js';
import environment from '@config/environment.js';

interface AuthResult {
    user: {
        id: string;
        email: string;
        otpVerified: boolean;
    };
    token: string;
}

class AuthService {

    async login(email: string, password: string): Promise<AuthResult> {
        // Check if email matches admin email
        const allowedAdminEmail = environment.ADMIN_EMAIL;

        if (email !== allowedAdminEmail) {
            throw ApiError.wrongCredentials(errorConstants.AUTHENTICATION.INVALID_CREDENTIALS);
        }

        let admin = await User.findOne({ email });
        if (!admin) {
            // First time: create the admin user in DB
            admin = new User({ email, password });
            await admin.save();
        }

        const isPasswordValid = await admin.comparePassword(password);
        if (!isPasswordValid) {
            throw ApiError.wrongCredentials(errorConstants.AUTHENTICATION.INVALID_CREDENTIALS);
        }

        const token = generateToken(admin._id.toString());
        return { 
            user: { 
                id: admin._id.toString(), 
                email: admin.email,
                otpVerified: admin.otpVerified
            }, 
            token 
        };
    }
 
    async forgotPassword(email: string): Promise<{ message: string }> {
        const adminEmail = process.env.ADMIN_EMAIL;
        if (!adminEmail) {
            throw ApiError.internal(errorConstants.AUTHENTICATION.ADMIN_EMAIL_NOT_CONFIGURED);
        }

        if (email !== adminEmail) {
            throw ApiError.notFound(errorConstants.AUTHENTICATION.ADMIN_NOT_FOUND);
        }

        // Generate 4-digit OTP
        const otp = generateOTP(4);
        const otpHash = hashOTP(otp);
        
        // Store OTP hash with 2 minutes TTL
        await storeOTP(email, otpHash, 120);
        
        // Send email with OTP
        try {
            const emailContent = await processTemplate('forgot-password', { otp });
            await sendEmail({ to: email, subject: 'Your FARAWAY Admin Password Reset OTP', html: emailContent });
        } catch (error: unknown) {
            logger.error(errorConstants.EXTERNAL_SERVICE.EMAIL_SEND_FAILED, { 
                error: error instanceof Error ? error.message : String(error), 
                email, 
                stack: error instanceof Error ? error.stack : undefined
            });
        }
        return { message: errorConstants.SUCCESS.PASSWORD_RESET_OTP_SENT };
    }

    async verifyOtp(email: string, otp: string): Promise<{ message: string }> {
        const adminEmail = process.env.ADMIN_EMAIL;
        if (!adminEmail) {
            throw ApiError.internal(errorConstants.AUTHENTICATION.ADMIN_EMAIL_NOT_CONFIGURED);
        }

        if (email !== adminEmail) {
            throw ApiError.notFound(errorConstants.AUTHENTICATION.ADMIN_NOT_FOUND);
        }

        // Get stored OTP hash and verify
        const storedOTP = await getStoredOTP(email);
        if (!storedOTP) {
            throw ApiError.badRequest(errorConstants.AUTHENTICATION.OTP_EXPIRED_OR_NOT_FOUND);
        }

        // Check if OTP is expired
        if (new Date() > storedOTP.expiresAt) {
            await clearOTP(email);
            throw ApiError.badRequest(errorConstants.AUTHENTICATION.OTP_EXPIRED);
        }

        // Verify OTP
        if (!verifyOTP(otp, storedOTP.hash)) {
            throw ApiError.badRequest(errorConstants.AUTHENTICATION.INVALID_OTP);
        }

        // Clear OTP after successful verification
        await clearOTP(email);
        
        // Set otpVerified flag
        await User.updateOne({ email }, { otpVerified: true });

        return { message: errorConstants.SUCCESS.OTP_VERIFIED };
    }

    async resetPassword(email: string, newPassword: string): Promise<{ message: string }> {
        const admin = await User.findOne({ email });
        if (!admin) {
            throw ApiError.notFound(errorConstants.AUTHENTICATION.ADMIN_NOT_FOUND);
        }

        if (!admin.otpVerified) {
            throw ApiError.forbidden(errorConstants.AUTHENTICATION.OTP_NOT_VERIFIED);
        }

        if (!newPassword || newPassword.length < 6) {
            throw ApiError.badRequest(errorConstants.AUTHENTICATION.PASSWORD_TOO_SHORT);
        }

        // Update password (will be hashed automatically by pre-save hook)
        admin.password = newPassword;
        admin.otpVerified = false; // Clear the flag after reset
        await admin.save();

        return { message: errorConstants.SUCCESS.PASSWORD_RESET_SUCCESS };
    }

    async resendOtp(email: string): Promise<{ message: string }> {
        const adminEmail = process.env.ADMIN_EMAIL;
        if (!adminEmail) {
            throw ApiError.internal(errorConstants.AUTHENTICATION.ADMIN_EMAIL_NOT_CONFIGURED);
        }

        if (email !== adminEmail) {
            throw ApiError.notFound(errorConstants.AUTHENTICATION.ADMIN_NOT_FOUND);
        }

        // Clear any existing OTP first
        await clearOTP(email);

        // Generate new OTP
        const otp = generateOTP(4);
        const otpHash = hashOTP(otp);
        
        // Store new OTP hash with 2 minutes TTL
        await storeOTP(email, otpHash, 120);
        
        // Send new OTP email
        try {
            const emailContent = await processTemplate('forgot-password', { otp });
            await sendEmail({ to: email, subject: 'Your FARAWAY Admin Password Reset OTP (Resent)', html: emailContent });
        } catch (error: any) {
            logger.error(errorConstants.EXTERNAL_SERVICE.EMAIL_SEND_FAILED, { 
                error: error.message, 
                email, 
                stack: error.stack 
            });
        }

        return { message: errorConstants.SUCCESS.OTP_RESENT };
    }

    async logout(): Promise<{ message: string }> {
        // In a real application, you might want to blacklist the token
        return { message: errorConstants.SUCCESS.ADMIN_LOGOUT_SUCCESS };
    }
}

export default new AuthService();
