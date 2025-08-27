import mongoose from 'mongoose';
import { logger } from '../core/utils/logger.js';
import environment from './environment.js';

const connectDB = async (): Promise<void> => {
    try {
        const mongoURI = environment.MONGO_URI;
        
        if (!mongoURI) {
            throw new Error('MONGO_URI is not defined in environment variables');
        }

        // Simplified MongoDB connection options
        const options = {
            maxPoolSize: environment.NODE_ENV === 'production' ? 20 : 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            autoIndex: environment.NODE_ENV === 'development',
            retryWrites: true,
            w: 'majority' as const,
            dbName: environment.MONGO_DB_NAME
        };

        await mongoose.connect(mongoURI, options);
        
        logger.info('✅ MongoDB connected successfully');
        logger.info(`🗄️  Database: ${environment.MONGO_DB_NAME}`);
        
        // Enhanced connection event handling
        mongoose.connection.on('error', (err) => {
            logger.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected');
        });

        mongoose.connection.on('reconnected', () => {
            logger.info('MongoDB reconnected');
        });

        mongoose.connection.on('close', () => {
            logger.warn('MongoDB connection closed');
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            logger.info('MongoDB connection closed through app termination');
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            await mongoose.connection.close();
            logger.info('MongoDB connection closed through app termination');
            process.exit(0);
        });

    } catch (error) {
        logger.error('❌ MongoDB connection failed:', error);
        process.exit(1);
    }
};

// Health check function for monitoring
export const checkDatabaseHealth = async (): Promise<boolean> => {
    try {
        if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
            // Ping the database
            await mongoose.connection.db.admin().ping();
            return true;
        }
        return false;
    } catch (error) {
        logger.error('Database health check failed:', error);
        return false;
    }
};

export default connectDB;
