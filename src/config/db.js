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

        const { connection } = await mongoose.connect(process.env.MONGO_URI);

        console.log('✅ DB connected: ' + connection.getClient().s.url);
    } catch (error) {
        console.log('❌ Error connecting database: ' + error);
        process.exit(1);
    }
};

export default connectDB;
