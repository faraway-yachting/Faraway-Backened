// Environment types
export const environments = <const>['development', 'production'];
export type Environment = typeof environments[number];

// Application environment interface
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
