import mongoose, { Schema } from 'mongoose';

// Tag interface
export interface TagInterface {
    name: string;
    slug: string;
    description?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

const tagSchema = new Schema<TagInterface>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 100,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            minlength: 2,
            maxlength: 100,
        },
        description: {
            type: String,
            trim: true,
            maxlength: 500,
        },
    },
    { timestamps: true }
);

// Add indexes for better performance
tagSchema.index({ slug: 1 }, { unique: true }); // Unique slug index
tagSchema.index({ name: 1 }); // Name index for search
tagSchema.index({ createdAt: -1 }); // Created date index for sorting



const tag = mongoose.model<TagInterface>('tag', tagSchema);

export default tag;
