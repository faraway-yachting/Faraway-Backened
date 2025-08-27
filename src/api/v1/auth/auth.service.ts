import bcrypt from 'bcryptjs';
import { IUser } from '../../../core/models/user.js';
import { IOTP } from '../../../core/models/otp.js';
import User from '../../../core/models/user.js';
import OTP from '../../../core/models/otp.js';
import { generateToken } from '../../../core/utils/helpers/jwt.js';
import { generateOTP } from '../../../core/utils/helpers/otp.js';
import { sendEmail } from '../../../core/utils/services/sendEmail.js';
import { processTemplate } from '../../../core/utils/helpers/processTemplate.js';
import { ApiError } from '../../../core/utils/helpers/api-error.js';

interface UserData {
    name: string;
    email: string;
    password: string;
    phone: string;
}

interface AuthResult {
    user: {
        id: string;
        name: string;
        email: string;
    };
    token: string;
}

class AuthService {
    async login(email: string, password: string): Promise<AuthResult> {
        const user = await User.findOne({ email }).exec() as IUser | null;
        if (!user) {
            throw new ApiError(401, 'Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new ApiError(401, 'Invalid credentials');
        }

        const token = generateToken(user._id.toString());
        return { 
            user: { 
                id: user._id.toString(), 
                name: user.name, 
                email: user.email 
            }, 
            token 
        };
    }

    async register(userData: UserData): Promise<AuthResult> {
        const existingUser = await User.findOne({ email: userData.email });
        if (existingUser) {
            throw new ApiError(400, 'User already exists');
        }

        const hashedPassword = await bcrypt.hash(userData.password, 12);
        const user = new User({
            ...userData,
            password: hashedPassword
        });

        await user.save();
        const token = generateToken(user._id.toString());
        return { 
            user: { 
                id: user._id.toString(), 
                name: user.name, 
                email: user.email 
            }, 
            token 
        };
    }

    async forgotPassword(email: string): Promise<{ message: string }> {
        const user = await User.findOne({ email });
        if (!user) {
            throw new ApiError(404, 'User not found');
        }

        const otp = generateOTP();
        const otpDoc = new OTP({
            email,
            otp,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
        });

        await otpDoc.save();

        // Send email with OTP
        const emailContent = await processTemplate('forgot-password', { otp });
        await sendEmail({ to: email, subject: 'Password Reset OTP', html: emailContent });

        return { message: 'OTP sent to your email' };
    }

    async verifyOtp(email: string, otp: string): Promise<{ message: string }> {
        const otpDoc = await OTP.findOne({ email, otp, expiresAt: { $gt: new Date() } });
        if (!otpDoc) {
            throw new ApiError(400, 'Invalid or expired OTP');
        }

        return { message: 'OTP verified successfully' };
    }

    async resetPassword(email: string, otp: string, newPassword: string): Promise<{ message: string }> {
        const otpDoc = await OTP.findOne({ email, otp, expiresAt: { $gt: new Date() } });
        if (!otpDoc) {
            throw new ApiError(400, 'Invalid or expired OTP');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await User.findOneAndUpdate({ email }, { password: hashedPassword });
        await OTP.deleteOne({ email, otp });

        return { message: 'Password reset successfully' };
    }

    async logout(userId?: string): Promise<{ message: string }> {
        // In a real application, you might want to blacklist the token
        return { message: 'Logged out successfully' };
    }
}

export default new AuthService();
