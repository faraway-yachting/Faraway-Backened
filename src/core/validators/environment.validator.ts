import joi from 'joi';
import { environments } from '../../shared/interfaces/environment.interface.js';

// Environment validation schema
export const environmentSchema = {
  NODE_ENV: joi.string().valid(...environments).required(),
  PORT: joi.number().min(1).max(65535).required(),
  API_VERSION: joi.string().default('v1'),
  API_BASE_URL: joi.string().uri().required(),
  FRONTEND_URL: joi.string().uri().required(),
  BACKEND_URL: joi.string().uri().required(),
  JWT_SECRET: joi.string().min(30).required(),
  JWT_EXPIRES_IN: joi.string().default('7d'),
  BCRYPT_ROUNDS: joi.number().default(12).min(10).max(16),
  MONGO_URI: joi.string().required(),
  MONGO_DB_NAME: joi.string().required(),
  CLOUDINARY_ENABLED: joi.boolean().default(false),
  CLOUDINARY_CLOUD_NAME: joi.string().when('CLOUDINARY_ENABLED', { is: true, then: joi.string().required() }).allow('').optional(),
  CLOUDINARY_API_KEY: joi.string().when('CLOUDINARY_ENABLED', { is: true, then: joi.string().required() }).allow('').optional(),
  CLOUDINARY_API_SECRET: joi.string().when('CLOUDINARY_ENABLED', { is: true, then: joi.string().required() }).allow('').optional(),
  ENABLE_EMAIL_SERVICE: joi.boolean().default(false),
  SMTP_HOST: joi.string().when('ENABLE_EMAIL_SERVICE', { is: true, then: joi.string().required() }),
  SMTP_PORT: joi.number().when('ENABLE_EMAIL_SERVICE', { is: true, then: joi.number().min(1).max(65535).required() }),
  SMTP_SECURE: joi.boolean().default(true),
  SMTP_USER: joi.string().when('ENABLE_EMAIL_SERVICE', { is: true, then: joi.string().required() }),
  SMTP_PASS: joi.string().when('ENABLE_EMAIL_SERVICE', { is: true, then: joi.string().required() }),
  SENDER_EMAIL: joi.string().email().required(),
  SENDER_NAME: joi.string().required(),
  ADMIN_EMAIL: joi.string().email().required(),
  ADMIN_PASSWORD: joi.string().min(8).required(),
  LOG_LEVEL: joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
};
