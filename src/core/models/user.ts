import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserInterface } from '../../shared/interfaces/user.interface';

// Extend UserInterface to include the comparePassword method
export interface User extends UserInterface {
    comparePassword(enteredPassword: string): Promise<boolean>;
}

const userSchema = new Schema<User>(
    {
        email: {
            type: String,
            unique: true,
            required: true,
        },
        password: {
            type: String,
            required: true,
        },
        otpVerified: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

// 🔐 Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// 🔑 Method to compare hashed passwords
userSchema.methods.comparePassword = async function (enteredPassword: string): Promise<boolean> {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Add indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ otpVerified: 1 });
userSchema.index({ createdAt: -1 });

const user = mongoose.model<User>('user', userSchema);

export default user;
