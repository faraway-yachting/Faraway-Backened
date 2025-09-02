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
  'string.base': errorConstants.GENERAL.ID_MUST_BE_STRING,
  'string.empty': errorConstants.GENERAL.ID_REQUIRED,
  'any.required': errorConstants.GENERAL.ID_REQUIRED,
});

// Create tag validation schema
const createTagSchema = Joi.object({
  name: nameSchema,
  slug: slugSchema,
  description: descriptionSchema.optional(),
});

// Update tag validation schema
const updateTagSchema = Joi.object({
  id: idSchema,
  name: nameSchema.optional(),
  slug: slugSchema.optional(),
  description: descriptionSchema.optional(),
}).min(2).messages({
  'object.min': errorConstants.TAG.UPDATE_FIELDS_REQUIRED,
});



// Get all tags query validation schema
const getAllTagsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': errorConstants.GENERAL.PAGE_MUST_BE_NUMBER,
    'number.integer': errorConstants.GENERAL.PAGE_MUST_BE_NUMBER,
    'number.min': errorConstants.GENERAL.PAGE_MIN_VALUE,
  }),
  limit: Joi.number().integer().min(1).max(100).default(10).messages({
    'number.base': errorConstants.GENERAL.LIMIT_MUST_BE_NUMBER,
    'number.integer': errorConstants.GENERAL.LIMIT_MUST_BE_NUMBER,
    'number.min': errorConstants.GENERAL.LIMIT_MIN_VALUE,
    'number.max': errorConstants.GENERAL.LIMIT_MAX_VALUE,
  }),
  search: Joi.string().trim().max(100).optional().messages({
    'string.base': errorConstants.GENERAL.SEARCH_MUST_BE_STRING,
    'string.max': errorConstants.GENERAL.SEARCH_MAX_LENGTH,
  }),
  sortBy: Joi.string().valid('name', 'createdAt', 'updatedAt').default('createdAt').messages({
    'string.base': errorConstants.GENERAL.SORT_BY_MUST_BE_STRING,
    'any.only': errorConstants.TAG.SORT_BY_INVALID,
  }),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc').messages({
    'string.base': errorConstants.GENERAL.SORT_ORDER_MUST_BE_STRING,
    'any.only': errorConstants.TAG.SORT_ORDER_INVALID,
  }),
});

export {
  createTagSchema,
  updateTagSchema,
  getAllTagsQuerySchema,
};
