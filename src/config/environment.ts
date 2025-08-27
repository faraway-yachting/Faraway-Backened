import joi from 'joi';
import dotenv from 'dotenv';
import { ApplicationEnv } from '../shared/interfaces/environment.interface.js';
import { environmentSchema } from '../core/validators/environment.validator.js';

// Load and validate environment
function loadEnvironment(): ApplicationEnv {
  
  const env = process.env['NODE_ENV'] || 'development';

  // Load environment-specific file directly
  try {
    dotenv.config({ path: `.env.${env}` });
  } catch (error) {
    throw new Error(`Failed to load environment file .env.${env}: ${error}`);
  }

  // Validate environment
  const { error, value } = joi.object(environmentSchema).validate(process.env, {
    allowUnknown: true,  // Allow system environment variables
    stripUnknown: false,
    abortEarly: false,
  });

  if (error) {
    const errorMessages = error.details.map((detail: any) =>
      `${detail.path.join('.')}: ${detail.message}`
    ).join('\n');
    throw new Error(`Environment validation failed:\n${errorMessages}`);
  }

  const validatedEnv = value as ApplicationEnv;

  // Single console log showing success
  console.log(`✅ Environment loaded successfully: ${validatedEnv.NODE_ENV} (Port: ${validatedEnv.PORT})`);

  return validatedEnv;
}

// Export environment
const environment = loadEnvironment();
export default environment;

// Export helpers
export const getEnv = (key: keyof ApplicationEnv): any => environment[key];
export const isProduction = (): boolean => environment.NODE_ENV === 'production';
export const isDevelopment = (): boolean => environment.NODE_ENV === 'development';

