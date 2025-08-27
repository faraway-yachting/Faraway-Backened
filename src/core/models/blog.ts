import mongoose, { Document, Schema } from 'mongoose';

export interface IBlog extends Document {
    title: string;
    content: string;
    category: 'travel' | 'lifestyle' | 'yachting' | 'destination';
    author: string;
    tags?: string[];
    image?: string;
    createdAt: Date;
    updatedAt: Date;
}

const blogSchema = new Schema<IBlog>({
    title: {
        type: String,
        required: true,
        trim: true,
        minlength: 5,
        maxlength: 200
    },
    content: {
        type: String,
        required: true,
        minlength: 50,
        maxlength: 5000
    },
    category: {
        type: String,
        required: true,
        enum: ['travel', 'lifestyle', 'yachting', 'destination']
    },
    author: {
        type: String,
        required: true,
        trim: true
    },
    tags: [{
        type: String,
        trim: true
    }],
    image: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Add indexes for better performance
blogSchema.index({ category: 1 });
blogSchema.index({ author: 1 });
blogSchema.index({ tags: 1 });
blogSchema.index({ createdAt: -1 });

export default mongoose.model<IBlog>('Blog', blogSchema);
