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
    // Update English with new content, retranslate all other languages
    // This ensures all translations stay in sync with the updated English content
    return {
      ...existingTranslations, // Preserve structure
      en: {
        ...existingTranslations.en,
        ...englishContent, // Update English with new content
      },
      // Use new translations (retranslated based on updated English)
      // If translation fails for a language, fallback to existing translation
      fr: translations.fr || existingTranslations.fr,
      de: translations.de || existingTranslations.de,
      ru: translations.ru || existingTranslations.ru,
      zh: translations.zh || existingTranslations.zh,
      th: translations.th || existingTranslations.th,
      ar: translations.ar || existingTranslations.ar,
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
