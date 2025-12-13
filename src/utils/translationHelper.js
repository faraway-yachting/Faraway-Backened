import { translateContent } from './translationService.js';
import logger from '../functions/logger.js';

export async function processTranslations(data, fieldConfig, existingTranslations = null) {
  if (data.translations) {
    return data.translations;
  }

  const englishContent = {};
  let hasEnglishContent = false;

  Object.keys(fieldConfig).forEach(fieldName => {
    if (data[fieldName]) {
      englishContent[fieldName] = data[fieldName];
      hasEnglishContent = true;
    } else if (existingTranslations?.en?.[fieldName]) {
      englishContent[fieldName] = existingTranslations.en[fieldName];
      hasEnglishContent = true;
    }
  });

  if (!hasEnglishContent) {
    return existingTranslations || {};
  }

  logger.info('🌐 Auto-translating content to all languages...');
  const translations = await translateContent(englishContent, fieldConfig);
  logger.info('✅ Translation completed');

  if (existingTranslations) {
    return {
      ...existingTranslations,
      en: {
        ...existingTranslations.en,
        ...englishContent,
      },
      ...translations,
    };
  }

  return translations;
}

export function extractEnglishContent(data, fieldConfig, translations = null) {
  const englishContent = {};
  
  Object.keys(fieldConfig).forEach(fieldName => {
    englishContent[fieldName] = data[fieldName] || translations?.en?.[fieldName] || '';
  });
  
  return englishContent;
}
