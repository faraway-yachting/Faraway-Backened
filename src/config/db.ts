import mongoose from 'mongoose';
import { logger } from '../core/utils/logger.js';

const connectDB = async (): Promise<void> => {
    try {
        const mongoURI = process.env['MONGO_URI'];
        
        if (!mongoURI) {
            throw new Error('MONGO_URI is not defined in environment variables');
        }

        // Production-ready MongoDB connection options
        const options = {
            maxPoolSize: 10, // Maximum number of connections in the pool
            serverSelectionTimeoutMS: 5000, // Timeout for server selection
            socketTimeoutMS: 45000, // Timeout for socket operations
            bufferMaxEntries: 0, // Disable mongoose buffering
            bufferCommands: false, // Disable mongoose buffering
            autoIndex: process.env['NODE_ENV'] === 'development', // Only build indexes in development
            retryWrites: true,
            w: 'majority' as const, // Write concern for production
            readPreference: 'secondaryPreferred' as const // Read from secondary in production
        };

        await mongoose.connect(mongoURI, options);
        
        logger.info('✅ MongoDB connected successfully');
        
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
