import User from '../../../core/models/user.js';
import { generateToken } from '../../../shared/helpers/jwt.js';
import OtpService from '../../../shared/services/otp.service.js';
import { ApiError } from '../../../shared/helpers/api-error.js';
import { errorConstants } from '@utils/error.codes.js';
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
        this.validateAdminEmail(email);

        // Use OTP service to generate and send OTP
        const result = await OtpService.generateAndSendOtp(email, false);
        
        if (!result.success) {
            throw ApiError.internal(result.message);
        }

        return { message: result.message };
    }

    async verifyOtp(email: string, otp: string): Promise<{ message: string }> {
        this.validateAdminEmail(email);

        // Use OTP service to verify OTP
        const result = await OtpService.verifyOtp(email, otp);
        
        if (!result.success) {
            throw ApiError.badRequest(result.message);
        }

        // Set otpVerified flag after successful verification
        await User.updateOne({ email }, { otpVerified: true });

        return { message: result.message };
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
        this.validateAdminEmail(email);

        // Clear any existing OTP first
        await OtpService.clearExistingOtp(email);

        // Use OTP service to generate and send new OTP
        const result = await OtpService.generateAndSendOtp(email, true);
        
        if (!result.success) {
            throw ApiError.internal(result.message);
        }

        return { message: result.message };
    }

    async logout(): Promise<{ message: string }> {
        // In a real application, you might want to blacklist the token
        return { message: errorConstants.SUCCESS.ADMIN_LOGOUT_SUCCESS };
    }

    // 🔹 Private helper methods
    private validateAdminEmail(email: string): void {
        const allowedAdminEmail = environment.ADMIN_EMAIL;
        if (!allowedAdminEmail) {
            throw ApiError.internal(errorConstants.AUTHENTICATION.ADMIN_EMAIL_NOT_CONFIGURED);
        }
        if (email !== allowedAdminEmail) {
            throw ApiError.notFound(errorConstants.AUTHENTICATION.ADMIN_NOT_FOUND);
        }
    }
}

export default new AuthService();
