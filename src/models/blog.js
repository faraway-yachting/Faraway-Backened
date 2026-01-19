import mongoose from 'mongoose';

const translationSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  title: {
    type: String,
    trim: true,
  },
  shortDescription: {
    type: String,
    trim: true,
  },
  detailDescription: {
    type: String,
    trim: true,
  },
}, { _id: false });

const blogSchema = new mongoose.Schema({
  
  image: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft',
  },
  translations: {
    en: {
      type: translationSchema,
      required: true,
    },
    fr: {
      type: translationSchema,
    },
    de: {
      type: translationSchema,
    },
    ru: {
      type: translationSchema,
    },
    zh: {
      type: translationSchema,
    },
    th: {
      type: translationSchema,
    },
    ar: {
      type: translationSchema,
    },
  },
}, {
  timestamps: true
});

blogSchema.index({ status: 1, createdAt: -1 });
blogSchema.index({ 'translations.en.title': 1 });

export default mongoose.model('Blog', blogSchema);