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

        // Connection options for better performance
        const options = {
            maxPoolSize: 10, // Maximum number of connections in the pool
            minPoolSize: 2,  // Minimum number of connections in the pool
            serverSelectionTimeoutMS: 30000, // Timeout for server selection (increased from 5000ms)
            socketTimeoutMS: 45000, // Socket timeout
            connectTimeoutMS: 30000, // Connection timeout
            bufferCommands: false, // Disable mongoose buffering
            retryWrites: true, // Enable retryable writes
            w: 'majority', // Write concern
        };

        console.log('🔄 Attempting to connect to MongoDB...');
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
        console.error('❌ Error connecting database:', error.message);
        console.error('📋 Error details:', {
            name: error.name,
            code: error.code,
            codeName: error.codeName,
        });
        
        // Provide helpful troubleshooting tips
        if (error.message.includes('timed out')) {
            console.error('💡 Troubleshooting tips:');
            console.error('   1. Check your internet connection');
            console.error('   2. Verify MongoDB Atlas IP whitelist includes your current IP');
            console.error('   3. Check if MongoDB Atlas cluster is running');
            console.error('   4. Verify MONGO_URI is correct in .env file');
        }
        
        process.exit(1);
    }
};

export default connectDB;
