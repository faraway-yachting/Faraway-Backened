import nodemailer from 'nodemailer';

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
    try {
        const senderEmail = process.env['SENDER_EMAIL'];
        const senderPassword = process.env['SENDER_PASSWORD'];

        if (!senderEmail || !senderPassword) {
            throw new Error('Email configuration is incomplete');
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
        console.log('Email sent successfully');
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send email');
    }
};

export default sendEmail;
