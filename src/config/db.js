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

        // Connection options for better performance and handling intermittent timeouts
        const options = {
            maxPoolSize: 10, // Maximum number of connections in the pool
            minPoolSize: 0,  // Don't keep idle connections (prevents stale connection reuse)
            serverSelectionTimeoutMS: 5000, // Timeout for server selection
            connectTimeoutMS: 10000, // Fail fast on initial connect
            socketTimeoutMS: 30000, // Socket timeout (30s - prevents long hangs)
            maxIdleTimeMS: 30000, // Close idle connections after 30s (prevents stale connections)
            heartbeatFrequencyMS: 10000, // Check connection health every 10s
            bufferCommands: false, // Disable mongoose buffering
        };

        const { connection } = await mongoose.connect(process.env.MONGO_URI, options);
        console.log('✅ Database connected successfully');

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

        connection.on('reconnected', () => {
            console.log('🔄 Database reconnected');
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
