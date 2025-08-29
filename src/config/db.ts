import mongoose from 'mongoose';
import { logger } from '../shared/utils/logger.js';
import environment from './environment.js';

const connectDB = async (): Promise<void> => {
    try {
        const mongoURI = environment.MONGO_URI;

        // Essential MongoDB connection options only
        const options = {
            maxPoolSize: environment.NODE_ENV === 'production' ? 20 : 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            autoIndex: environment.NODE_ENV === 'development',
            retryWrites: true,
            dbName: environment.MONGO_DB_NAME
        };

        await mongoose.connect(mongoURI, options);
        
        // Essential connection event handling only
        mongoose.connection.on('error', (err) => {
            logger.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected');
        });

        // Single logger call showing success
        logger.info(`✅ MongoDB connected successfully: ${environment.MONGO_DB_NAME}`);

    } catch (error) {
        logger.error('❌ MongoDB connection failed:', error);
        process.exit(1);
    }
};

// Health check function for monitoring
export const checkDatabaseHealth = async (): Promise<boolean> => {
    try {
        if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
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
