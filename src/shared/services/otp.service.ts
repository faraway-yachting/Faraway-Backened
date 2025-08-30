import crypto from 'crypto';
import Otp from '@core/models/otp.js';
import { sendEmail } from './sendEmail.js';
import { processTemplate } from '@helpers/processTemplate.js';
import { logger } from '@utils/logger.js';
import { errorConstants } from '@utils/error.codes.js';

interface OtpResult {
    success: boolean;
    message: string;
    otp?: string;
}

class OtpService {
 
    /**
     * Generate a numeric OTP
     */
    private generateOTP(length = 4): string {
        let otp = '';
        for (let i = 0; i < length; i++) {
            otp += Math.floor(Math.random() * 10);
        }
        return otp;
    }

    /**
     * Hash the OTP using SHA256
     */
    private hashOTP(otp: string): string {
        return crypto.createHash('sha256').update(otp).digest('hex');
    }

    /**
     * Verify the OTP by comparing hashes
     */
    private verifyOTP(plainOtp: string, storedHash: string): boolean {
        return this.hashOTP(plainOtp) === storedHash;
    }

    /**
     * Store OTP hash and expiry in MongoDB
     */
    private async storeOTP(email: string, hash: string, ttlSeconds = 120): Promise<void> {
        const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
        await Otp.deleteMany({ email }); // Remove any existing OTPs for this email
        await Otp.create({ email, otp: hash, expiresAt });
    }

    /**
     * Get stored OTP hash and expiry
     */
    private async getStoredOTP(email: string): Promise<{ hash: string; expiresAt: Date } | null> {
        const otp = await Otp.findOne({ email });
        return otp ? { hash: otp.otp, expiresAt: otp.expiresAt } : null;
    }

    /**
     * Clear stored OTP
     */
    private async clearOTP(email: string): Promise<void> {
        await Otp.deleteMany({ email });
    }

    /**
     * Generate, store, and send OTP for password reset
     */
    async generateAndSendOtp(email: string, isResend: boolean = false): Promise<OtpResult> {
        try {
            // Generate 4-digit OTP
            const otp = this.generateOTP(4);
            const otpHash = this.hashOTP(otp);
            
            // Store OTP hash with 2 minutes TTL
            await this.storeOTP(email, otpHash, 120);
            
            // Send email with OTP
            await this.sendOtpEmail(email, otp, isResend);
            
            return {
                success: true,
                message: isResend 
                    ? errorConstants.SUCCESS.OTP_RESENT 
                    : errorConstants.SUCCESS.PASSWORD_RESET_OTP_SENT,
                otp
            };
        } catch (error: unknown) {
            logger.error('Failed to generate and send OTP:', { 
                error: error instanceof Error ? error.message : String(error), 
                email, 
                stack: error instanceof Error ? error.stack : undefined
            });
            
            return {
                success: false,
                message: errorConstants.EXTERNAL_SERVICE.EMAIL_SEND_FAILED
            };
        }
    }

    /**
     * Verify OTP and clear it after successful verification
     */
    async verifyOtp(email: string, otp: string): Promise<OtpResult> {
        try {
            // Get stored OTP hash and verify
            const storedOTP = await this.getStoredOTP(email);
            if (!storedOTP) {
                return {
                    success: false,
                    message: errorConstants.AUTHENTICATION.OTP_EXPIRED_OR_NOT_FOUND
                };
            }

            // Check if OTP is expired
            if (new Date() > storedOTP.expiresAt) {
                await this.clearOTP(email);
                return {
                    success: false,
                    message: errorConstants.AUTHENTICATION.OTP_EXPIRED
                };
            }

            // Verify OTP
            if (!this.verifyOTP(otp, storedOTP.hash)) {
                return {
                    success: false,
                    message: errorConstants.AUTHENTICATION.INVALID_OTP
                };
            }

            // Clear OTP after successful verification
            await this.clearOTP(email);
            
            return {
                success: true,
                message: errorConstants.SUCCESS.OTP_VERIFIED
            };
        } catch (error: unknown) {
            logger.error('Failed to verify OTP:', { 
                error: error instanceof Error ? error.message : String(error), 
                email, 
                stack: error instanceof Error ? error.stack : undefined
            });
            
            return {
                success: false,
                message: errorConstants.GENERAL.INTERNAL_SERVER_ERROR
            };
        }
    }

    /**
     * Clear existing OTP for an email
     */
    async clearExistingOtp(email: string): Promise<void> {
        try {
            await this.clearOTP(email);
        } catch (error: unknown) {
            logger.error('Failed to clear existing OTP:', { 
                error: error instanceof Error ? error.message : String(error), 
                email, 
                stack: error instanceof Error ? error.stack : undefined
            });
        }
    }

    /**
     * Send OTP email with proper error handling
     */
    private async sendOtpEmail(email: string, otp: string, isResend: boolean = false): Promise<void> {
        try {
            const emailContent = await processTemplate('forgot-password', { otp });
            const subject = isResend 
                ? 'Your FARAWAY Admin Password Reset OTP (Resent)'
                : 'Your FARAWAY Admin Password Reset OTP';
            
            await sendEmail({ to: email, subject, html: emailContent });
        } catch (error: unknown) {
            logger.error(errorConstants.EXTERNAL_SERVICE.EMAIL_SEND_FAILED, { 
                error: error instanceof Error ? error.message : String(error), 
                email, 
                stack: error instanceof Error ? error.stack : undefined
            });
            throw error; // Re-throw to handle in calling method
        }
    }
}

export default new OtpService();
