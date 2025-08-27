import dotenv from 'dotenv';

const environmentConfig = (): void => {
    // Load environment variables based on NODE_ENV
    const env = process.env['NODE_ENV'] || 'development';
    
    if (env === 'production') {
        dotenv.config({ path: '.env.production' });
    } else if (env === 'test') {
        dotenv.config({ path: '.env.test' });
    } else {
        dotenv.config({ path: '.env.development' });
    }

    // Define required and optional environment variables
    const requiredEnvVars = [
        'MONGO_URI',
        'JWT_SECRET'
    ];

    const optionalEnvVars = [
        'CLOUDINARY_CLOUD_NAME',
        'CLOUDINARY_API_KEY',
        'CLOUDINARY_API_SECRET',
        'SENDER_EMAIL',
        'SENDER_PASSWORD'
    ];

    // Check required variables
    const missingRequiredEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingRequiredEnvVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingRequiredEnvVars.join(', ')}`);
    }

    // Check optional variables and provide warnings
    const missingOptionalEnvVars = optionalEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingOptionalEnvVars.length > 0) {
        console.warn(`⚠️  Warning: Missing optional environment variables: ${missingOptionalEnvVars.join(', ')}`);
        console.warn('   These features will not work until configured:');
        
        if (missingOptionalEnvVars.includes('CLOUDINARY_CLOUD_NAME') || 
            missingOptionalEnvVars.includes('CLOUDINARY_API_KEY') || 
            missingOptionalEnvVars.includes('CLOUDINARY_API_SECRET')) {
            console.warn('   - File uploads (Cloudinary)');
        }
        
        if (missingOptionalEnvVars.includes('SENDER_EMAIL') || 
            missingOptionalEnvVars.includes('SENDER_PASSWORD')) {
            console.warn('   - Email functionality (SMTP)');
        }
        
        console.warn('   Please check env.example for configuration details.');
    }

    console.log('✅ Environment configuration loaded successfully');
};

export default environmentConfig;
