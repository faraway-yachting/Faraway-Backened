import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const connectDB = async () => {
    try {
        console.log('🔍 Checking MONGO_URI:', process.env.MONGO_URI ? 'Found' : 'Not found');
        
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI environment variable is not set');
        }

        // Connection options for better performance and resilience to timeouts
        const options = {
            maxPoolSize: 10,
            minPoolSize: 0,  // Avoid idle connections that can go stale and timeout
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000,
            socketTimeoutMS: 20000,
            maxIdleTimeMS: 60000, // Close idle connections after 1 min (reduces stale timeouts)
            waitQueueTimeoutMS: 10000, // Fail fast if no pool connection within 10s
            bufferCommands: false,
        };

        const { connection } = await mongoose.connect(process.env.MONGO_URI, options);

        // Set up connection event listeners
        connection.on('connected', () => {
        console.log('✅ Database connected successfully');
        });

        connection.on('error', (err) => {
            console.error('❌ Database connection error:', err);
        });

        connection.on('disconnected', () => {
            console.log('⚠️ Database disconnected');
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await connection.close();
            console.log('Database connection closed through app termination');
            process.exit(0);
        });

    } catch (error) {
        console.log('❌ Error connecting database:', error.message);
        process.exit(1);
    }
};

export default connectDB;
