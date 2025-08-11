import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs/promises';
import processTemplate from './processTemplate.js';
import dotenv from 'dotenv';
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
console.log(__filename,__dirname)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: false, // Use secure for port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});
console.log(process.env.SMTP_HOST,process.env.SMTP_PORT,process.env.SMTP_USER,process.env.SMTP_PASS)
export const sendEmail = async ({
  to,
  subject,
  templateName,
  replacements = {},
}) => {
  try {
    // Validate inputs
    if (!to || !subject || !templateName) {
      throw new Error(
        'Missing required parameters: to, subject, or templateName'
      );
    }
    if (!process.env.SENDER_EMAIL) {
      throw new Error('SENDER_EMAIL environment variable is not set');
    }

    // Construct and validate template path
    const templatePath = path.join(
      __dirname,
      '../Templates',
      `${templateName}.html`
    );
    try {
      console.log(templatePath)
      await fs.access(templatePath); // Check if template file exists
    } catch {
      throw new Error(`Template file ${templateName}.html not found`);
    }

    // Process template
    const htmlContent = await processTemplate(templatePath, replacements);

    // Configure email options
    const mailOptions = {
      from: `Faraway <${process.env.SENDER_EMAIL}>`,
      to,
      subject,
      html: htmlContent,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

export default sendEmail;
