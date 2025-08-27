import joi from 'joi';
import dotenv from 'dotenv';
// import { logger } from '../core/utils/logger.js';

// Environment types
const environments = <const>['development', 'production'];
export type Environment = typeof environments[number];

// Simplified application environment interface
export interface ApplicationEnv {
  NODE_ENV: Environment;
  PORT: number;
  API_VERSION: string;
  API_BASE_URL: string;
  FRONTEND_URL: string;
  BACKEND_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  BCRYPT_ROUNDS: number;
  MONGO_URI: string;
  MONGO_DB_NAME: string;
  CLOUDINARY_ENABLED: boolean;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
  ENABLE_EMAIL_SERVICE: boolean;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_SECURE: boolean;
  SMTP_USER: string;
  SMTP_PASS: string;
  SENDER_EMAIL: string;
  SENDER_NAME: string;
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD: string;
  LOG_LEVEL: string;
}

// Joi validation schema
const schema = {
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

// Load and validate environment
function loadEnvironment(): ApplicationEnv {
  console.log('🔍 Starting environment loading...');
  const env = process.env['NODE_ENV'] || 'development';
  console.log('🌍 NODE_ENV:', env);
  
  // Load base .env first (for common variables)
  try {
    console.log('📁 Loading base .env...');
    dotenv.config();
    console.log('✅ Base .env loaded');
  } catch {
    console.log('⚠️  Could not load base .env file');
  }

  // Load environment-specific file (overrides base)
  try {
    console.log(`📁 Loading .env.${env}...`);
    dotenv.config({ path: `.env.${env}` });
    console.log(`✅ Environment loaded: ${env}`);
  } catch {
    console.log(`⚠️  Could not load .env.${env} file`);
  }

  console.log('🔍 Starting validation...');
  // Validate environment
  const { error, value } = joi.object(schema).validate(process.env, {
    allowUnknown: true,  // Allow system environment variables
    stripUnknown: false,
    abortEarly: false,
  });

  if (error) {
    console.log('❌ Validation errors:', error.details);
    const errorMessages = error.details.map(detail => 
      `${detail.path.join('.')}: ${detail.message}`
    ).join('\n');
    throw new Error(`Environment validation failed:\n${errorMessages}`);
  }

  console.log('✅ Validation passed');
  const validatedEnv = value as ApplicationEnv;
  
  // Log summary
  console.log(`🌍 Environment: ${validatedEnv.NODE_ENV}`);
  console.log(`🚀 Server Port: ${validatedEnv.PORT}`);
  console.log(`📡 API Version: ${validatedEnv.API_VERSION}`);
  console.log(`🗄️  Database: ${validatedEnv.MONGO_DB_NAME}`);
  
  return validatedEnv;
}

// Export environment
const environment = loadEnvironment();
export default environment;

// Export helpers
export const getEnv = (key: keyof ApplicationEnv): any => environment[key];
export const isProduction = (): boolean => environment.NODE_ENV === 'production';
export const isDevelopment = (): boolean => environment.NODE_ENV === 'development';

