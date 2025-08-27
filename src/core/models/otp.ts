import mongoose, { Document, Schema } from 'mongoose';

export interface IOTP extends Document {
    email: string;
    otp: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const otpSchema = new Schema<IOTP>({
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    otp: {
        type: String,
        required: true,
        length: 6
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 }
    }
}, {
    timestamps: true
});

export default mongoose.model<IOTP>('OTP', otpSchema);
