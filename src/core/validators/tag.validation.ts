import Joi from 'joi';
import errorConstants from '../../shared/utils/error.codes.js';

const nameSchema = Joi.string().trim().min(2).max(100).required().messages({
  'string.base': errorConstants.TAG.NAME_MUST_BE_STRING,
  'string.empty': errorConstants.TAG.NAME_REQUIRED,
  'string.min': errorConstants.TAG.NAME_MIN_LENGTH,
  'string.max': errorConstants.TAG.NAME_MAX_LENGTH,
  'any.required': errorConstants.TAG.NAME_REQUIRED,
});

const slugSchema = Joi.string().trim().lowercase().min(2).max(100).pattern(/^[a-z0-9-]+$/).required().messages({
  'string.base': errorConstants.TAG.SLUG_MUST_BE_STRING,
  'string.empty': errorConstants.TAG.SLUG_REQUIRED,
  'string.min': errorConstants.TAG.SLUG_MIN_LENGTH,
  'string.max': errorConstants.TAG.SLUG_MAX_LENGTH,
  'string.pattern.base': errorConstants.TAG.SLUG_INVALID_FORMAT,
  'any.required': errorConstants.TAG.SLUG_REQUIRED,
});

const descriptionSchema = Joi.string().trim().max(500).allow('').messages({
  'string.base': errorConstants.TAG.DESCRIPTION_MUST_BE_STRING,
  'string.max': errorConstants.TAG.DESCRIPTION_MAX_LENGTH,
});

const idSchema = Joi.string().trim().required().messages({
  'string.base': 'ID must be a string.',
  'string.empty': 'ID is required.',
  'any.required': 'ID is required.',
});

// Create tag validation schema
const createTagSchema = Joi.object({
  name: nameSchema,
  slug: slugSchema,
  description: descriptionSchema.optional(),
});

// Update tag validation schema
const updateTagSchema = Joi.object({
  name: nameSchema.optional(),
  slug: slugSchema.optional(),
  description: descriptionSchema.optional(),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update.',
});

// Delete tag validation schema
const deleteTagSchema = Joi.object({
  id: idSchema,
});

// Get all tags query validation schema
const getAllTagsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Page must be a number.',
    'number.integer': 'Page must be an integer.',
    'number.min': 'Page must be at least 1.',
  }),
  limit: Joi.number().integer().min(1).max(100).default(10).messages({
    'number.base': 'Limit must be a number.',
    'number.integer': 'Limit must be an integer.',
    'number.min': 'Limit must be at least 1.',
    'number.max': 'Limit must not exceed 100.',
  }),
  search: Joi.string().trim().max(100).optional().messages({
    'string.base': 'Search must be a string.',
    'string.max': 'Search must not exceed 100 characters.',
  }),
  sortBy: Joi.string().valid('name', 'createdAt', 'updatedAt').default('createdAt').messages({
    'string.base': 'SortBy must be a string.',
    'any.only': 'SortBy must be one of: name, createdAt, updatedAt.',
  }),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc').messages({
    'string.base': 'SortOrder must be a string.',
    'any.only': 'SortOrder must be either asc or desc.',
  }),
});

export {
  createTagSchema,
  updateTagSchema,
  deleteTagSchema,
  getAllTagsQuerySchema,
};
