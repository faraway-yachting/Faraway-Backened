import Joi from 'joi';

export function createTranslationContentSchema(fields) {
  const schemaObject = {};
  
  fields.forEach(field => {
    if (field.type === 'string') {
      schemaObject[field.name] = Joi.string().trim().optional();
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
          acc[field.name] = Joi.string().trim();
          if (field.min) acc[field.name] = acc[field.name].min(field.min);
          if (field.max) acc[field.name] = acc[field.name].max(field.max);
          if (field.required) acc[field.name] = acc[field.name].required();
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
  { name: 'title', type: 'string', min: 3, max: 200, required: true },
  { name: 'shortDescription', type: 'string', min: 10, max: 600, required: true },
  { name: 'detailDescription', type: 'string', min: 10, required: true },
];

export const YACHT_TRANSLATION_FIELDS = [
  { name: 'title', type: 'string', min: 3, max: 200, required: true },
  { name: 'dayCharter', type: 'string', min: 10, required: false },
  { name: 'overnightCharter', type: 'string', min: 10, required: false },
  { name: 'aboutThisBoat', type: 'string', min: 10, required: false },
  { name: 'specifications', type: 'string', min: 10, required: false },
  { name: 'boatLayout', type: 'string', min: 10, required: false },
];
