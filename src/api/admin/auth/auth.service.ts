import User from '../../../core/models/user.js';
import { generateToken } from '../../../shared/helpers/jwt.js';
import { generateOTP } from '../../../shared/helpers/otp.js';
import { sendEmail } from '../../../shared/services/sendEmail.js';
import { processTemplate } from '../../../shared/helpers/processTemplate.js';
import { ApiError } from '../../../shared/helpers/api-error.js';
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
            throw ApiError.wrongCredentials('Invalid admin credentials');
        }

        let admin = await User.findOne({ email });
        if (!admin) {
            // First time: create the admin user in DB
            admin = new User({ email, password });
            await admin.save();
        }

        const isPasswordValid = await admin.comparePassword(password);
        if (!isPasswordValid) {
            throw ApiError.wrongCredentials('Invalid admin credentials');
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
            throw ApiError.internal('Admin email not configured');
        }

        if (email !== adminEmail) {
            throw ApiError.notFound('Admin not found');
        }

        // Generate 4-digit OTP
        const otp = generateOTP();
        

        // Send email with OTP
        try {
            const emailContent = await processTemplate('forgot-password', { otp });
            await sendEmail({ to: email, subject: 'Admin Password Reset OTP', html: emailContent });
        } catch (error) {
            console.error('Failed to send email:', error);
            // Don't fail the request if email fails
        }

        return { message: 'OTP sent to admin email' };
    }

    async verifyOtp(email: string, otp: string): Promise<{ message: string }> {
        const adminEmail = process.env.ADMIN_EMAIL;
        if (!adminEmail) {
            throw ApiError.internal('Admin email not configured');
        }

        if (email !== adminEmail) {
            throw ApiError.notFound('Admin not found');
        }

        // TODO: Verify OTP from database/Redis
        // For now, we'll just return success
        
        // Set otpVerified flag
        await User.updateOne({ email }, { otpVerified: true });

        return { message: 'OTP verified successfully' };
    }

    async resetPassword(email: string, newPassword: string): Promise<{ message: string }> {
        const admin = await User.findOne({ email });
        if (!admin) {
            throw ApiError.notFound('Admin not found');
        }

        if (!admin.otpVerified) {
            throw ApiError.forbidden('OTP not verified');
        }

        if (!newPassword || newPassword.length < 6) {
            throw ApiError.badRequest('Password must be at least 6 characters');
        }

        // Update password (will be hashed automatically by pre-save hook)
        admin.password = newPassword;
        admin.otpVerified = false; // Clear the flag after reset
        await admin.save();

        return { message: 'Admin password reset successfully' };
    }

    async resendOtp(email: string): Promise<{ message: string }> {
        const adminEmail = process.env.ADMIN_EMAIL;
        if (!adminEmail) {
            throw ApiError.internal('Admin email not configured');
        }

        if (email !== adminEmail) {
            throw ApiError.notFound('Admin not found');
        }

        // Generate new OTP
        const otp = generateOTP();
        
        // TODO: Store new OTP in database/Redis with expiry
        
        // Send new OTP email
        try {
            const emailContent = await processTemplate('forgot-password', { otp });
            await sendEmail({ to: email, subject: 'Admin Password Reset OTP (Resent)', html: emailContent });
        } catch (error) {
            console.error('Failed to send email:', error);
            // Don't fail the request if email fails
        }

        return { message: 'OTP resent to admin email' };
    }

    async logout(): Promise<{ message: string }> {
        // In a real application, you might want to blacklist the token
        return { message: 'Admin logged out successfully' };
    }
}

export default new AuthService();
