import mongoose from 'mongoose';

const blogSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  image: {
    type: String,
    required: true,
  },
  shortDescription: {
    type: String,
    required: true,
    trim: true,
  },
  detailDescription: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft',
  },
}, {
  timestamps: true // Replacing createdAt and updatedAt
});

export default mongoose.model('Blog', blogSchema);