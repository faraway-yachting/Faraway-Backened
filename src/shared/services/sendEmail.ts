import nodemailer from 'nodemailer';
import { ApiError } from '@helpers/api-error.js';
import { errorConstants } from '@utils/error.codes.js';
import { logger } from '@utils/logger.js';
import environment from '@config/environment.js';

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
    try {
        const senderEmail = environment.SENDER_EMAIL;
        const senderPassword = environment.SMTP_PASS;

        if (!senderEmail || !senderPassword) {
            logger.error('Email configuration missing', { 
                hasEmail: !!senderEmail, 
                hasPassword: !!senderPassword 
            });
            throw new ApiError(
                500,
                'Email service not configured'
            );
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: senderEmail,
                pass: senderPassword
            }
        });

        const mailOptions = {
            from: senderEmail,
            to: options.to,
            subject: options.subject,
            html: options.html
        };

        await transporter.sendMail(mailOptions);
        logger.info('Email sent successfully', { to: options.to, subject: options.subject });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown email error';
        logger.error('Failed to send email', { 
            error: errorMessage, 
            to: options.to, 
            subject: options.subject,
            stack: error instanceof Error ? error.stack : undefined
        });
        
        if (error instanceof ApiError) {
            throw error;
        }
        
        throw new ApiError(
            500,
            errorConstants.EXTERNAL_SERVICE.EMAIL_SEND_FAILED || 'Failed to send email'
        );
    }
};

export default sendEmail;
