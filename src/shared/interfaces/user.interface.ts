import mongoose from 'mongoose';

// User Interface for the database model
export interface UserInterface extends mongoose.Document {
    _id: mongoose.Types.ObjectId;
    email: string;
    password: string;
    otpVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(enteredPassword: string): Promise<boolean>;
}
