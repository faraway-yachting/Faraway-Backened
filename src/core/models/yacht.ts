import mongoose, { Document, Schema } from 'mongoose';

export interface IYacht extends Document {
    name: string;
    description: string;
    type: 'motor' | 'sailing' | 'catamaran' | 'luxury';
    length: number;
    capacity: number;
    price: number;
    location: string;
    amenities?: string[];
    images?: string[];
    createdAt: Date;
    updatedAt: Date;
}

const yachtSchema = new Schema<IYacht>({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 100
    },
    description: {
        type: String,
        required: true,
        minlength: 10,
        maxlength: 1000
    },
    type: {
        type: String,
        required: true,
        enum: ['motor', 'sailing', 'catamaran', 'luxury']
    },
    length: {
        type: Number,
        required: true,
        min: 1
    },
    capacity: {
        type: Number,
        required: true,
        min: 1
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    location: {
        type: String,
        required: true,
        trim: true
    },
    amenities: [{
        type: String,
        trim: true
    }],
    images: [{
        type: String,
        trim: true
    }]
}, {
    timestamps: true
});

// Add indexes for better performance
yachtSchema.index({ type: 1 });
yachtSchema.index({ location: 1 });
yachtSchema.index({ price: 1 });
yachtSchema.index({ capacity: 1 });
yachtSchema.index({ createdAt: -1 });

export default mongoose.model<IYacht>('Yacht', yachtSchema);
