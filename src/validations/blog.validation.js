import Joi from 'joi';
import { createTranslationsSchema, BLOG_TRANSLATION_FIELDS } from '../utils/translationSchema.js';

const objectIdSchema = Joi.string()
  .length(24)
  .hex()
  .required()
  .messages({
    'any.required': 'Blog ID is required',
    'string.length': 'ID must be a valid MongoDB ObjectId',
    'string.hex': 'ID must be a valid MongoDB ObjectId',
  });

const blogTranslationsSchema = createTranslationsSchema(BLOG_TRANSLATION_FIELDS, 'en');

const addBlogSchema = Joi.object({
  image: Joi.any()
    .required()
    .messages({
      'any.required': 'Blog image is required',
    }),
  translations: blogTranslationsSchema.required(),
  status: Joi.string()
    .valid('draft', 'published')
    .default('draft')
    .messages({
      'any.only': 'Status must be either draft or published',
    }),
});

const editBlogSchema = Joi.object({
  image: Joi.string()
    .optional()
    .messages({
      'string.base': 'Image must be a string',
    }),
  translations: blogTranslationsSchema,
  status: Joi.string()
    .valid('draft', 'published')
    .optional()
    .messages({
      'any.only': 'Status must be either draft or published',
    }),
});

const getAllBlogsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string().valid('draft', 'published').optional().messages({
    'any.only': 'Status must be either draft or published',
  }),
});

const getBlogByIdSchema = Joi.object({
  id: objectIdSchema,
});

const getBlogBySlugSchema = Joi.object({
  slug: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z0-9-]+$/)
    .required()
    .messages({
      'any.required': 'Blog slug is required',
      'string.pattern.base': 'Slug can only contain lowercase letters, numbers, and hyphens',
    }),
});

const deleteBlogSchema = Joi.object({
  id: objectIdSchema,
});

const updateBlogStatusSchema = Joi.object({
  status: Joi.string()
    .valid('draft', 'published')
    .required()
    .messages({
      'any.required': 'Status is required',
      'any.only': 'Status must be either draft or published',
    }),
});

export {
  addBlogSchema, deleteBlogSchema, editBlogSchema,
  getAllBlogsSchema,
  getBlogByIdSchema,
  getBlogBySlugSchema, updateBlogStatusSchema
};

