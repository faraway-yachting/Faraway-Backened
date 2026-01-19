import Joi from 'joi';

export function createTranslationContentSchema(fields) {
  const schemaObject = {};
  
  fields.forEach(field => {
    if (field.type === 'string') {
      // Optional string fields should allow empty strings
      schemaObject[field.name] = Joi.string().trim().allow('').optional();
      if (field.min) schemaObject[field.name] = schemaObject[field.name].min(field.min);
      if (field.max) schemaObject[field.name] = schemaObject[field.name].max(field.max);
    } else if (field.type === 'array') {
      schemaObject[field.name] = Joi.array().items(Joi.string()).optional();
    }
  });
  
  return Joi.object(schemaObject).optional();
}

export function createTranslationsSchema(fields, requiredLanguage = 'en') {
  const translationContentSchema = createTranslationContentSchema(fields);
  
  const translationsObject = {
    en: Joi.object(
      fields.reduce((acc, field) => {
        if (field.type === 'string') {
          let schema = Joi.string().trim().allow('');
          if (field.min) schema = schema.min(field.min);
          if (field.max) schema = schema.max(field.max);
          if (field.required) schema = schema.required();
          acc[field.name] = schema;
        } else if (field.type === 'array') {
          acc[field.name] = Joi.array().items(Joi.string());
          if (field.required) acc[field.name] = acc[field.name].required();
        }
        return acc;
      }, {})
    ),
    fr: translationContentSchema,
    de: translationContentSchema,
    ru: translationContentSchema,
    zh: translationContentSchema,
    th: translationContentSchema,
    ar: translationContentSchema,
  };
  
  if (requiredLanguage === 'en') {
    translationsObject.en = translationsObject.en.required();
  }
  
  return Joi.object(translationsObject).optional();
}

export const BLOG_TRANSLATION_FIELDS = [
  { name: 'slug', type: 'string', min: 3, max: 200, required: true },
  { name: 'title', type: 'string', min: 3, max: 200, required: true },
  { name: 'shortDescription', type: 'string', min: 10, max: 600, required: true },
  { name: 'detailDescription', type: 'string', min: 10, required: true },
];

export const YACHT_TRANSLATION_FIELDS = [
  { name: 'slug', type: 'string', min: 3, max: 200, required: true },
  { name: 'title', type: 'string', min: 3, max: 200, required: true },
  // Optional rich-text fields; allow empty string
  { name: 'dayCharter', type: 'string', required: false },
  { name: 'overnightCharter', type: 'string', required: false },
  { name: 'aboutThisBoat', type: 'string', required: false },
  { name: 'specifications', type: 'string', required: false },
  { name: 'boatLayout', type: 'string', required: false },
  { name: 'tags', type: 'array', required: false },
];
