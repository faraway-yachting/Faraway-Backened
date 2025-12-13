import OpenAI from 'openai';
import logger from '../functions/logger.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const SUPPORTED_LANGUAGES = {
  en: 'English',
  fr: 'French',
  de: 'German',
  ru: 'Russian',
  zh: 'Chinese',
  th: 'Thai',
  ar: 'Arabic',
};

export const DEFAULT_TARGET_LANGUAGES = ['fr', 'de', 'ru', 'zh', 'th', 'ar'];

async function translateText(text, targetLanguage, useGPT4 = false) {
  if (!text || !text.trim()) {
    return '';
  }

  if (!process.env.OPENAI_API_KEY) {
    logger.warn('⚠️ OPENAI_API_KEY not set, skipping translation');
    return text;
  }

  try {
    const model = useGPT4 ? 'gpt-4' : 'gpt-4o-mini';
    const languageName = SUPPORTED_LANGUAGES[targetLanguage] || targetLanguage;

    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: `You are a professional translator. Translate the following text to ${languageName}. Maintain the same HTML structure, formatting, and style. Only return the translated text without any explanations or additional content.`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0.3,
      max_tokens: useGPT4 ? 4000 : 1000,
    });

    const translatedText = response.choices[0]?.message?.content?.trim() || text;
    return translatedText;
  } catch (error) {
    logger.error(`❌ Translation error for ${targetLanguage}:`, error.message);
    return text;
  }
}

export async function translateContent(englishContent, fieldConfig, targetLanguages = DEFAULT_TARGET_LANGUAGES) {
  if (!englishContent || typeof englishContent !== 'object') {
    logger.warn('⚠️ Invalid English content provided for translation');
    return {};
  }

  const translations = {
    en: { ...englishContent },
  };

  logger.info(`🌐 Starting translation to ${targetLanguages.length} languages`);

  for (const lang of targetLanguages) {
    if (lang === 'en') continue;

    try {
      logger.info(`🔄 Translating to ${SUPPORTED_LANGUAGES[lang]}...`);

      const translationPromises = Object.keys(fieldConfig).map(async (fieldName) => {
        const config = fieldConfig[fieldName];
        const englishValue = englishContent[fieldName] || '';
        
        if (!englishValue) {
          return { fieldName, translatedValue: '' };
        }

        const translatedValue = await translateText(englishValue, lang, config.useGPT4 || false);
        return { fieldName, translatedValue: translatedValue || englishValue };
      });

      const translationResults = await Promise.all(translationPromises);
      
      const translatedObject = {};
      translationResults.forEach(({ fieldName, translatedValue }) => {
        translatedObject[fieldName] = translatedValue;
      });

      translations[lang] = translatedObject;
      logger.info(`✅ Translation to ${SUPPORTED_LANGUAGES[lang]} completed`);
    } catch (error) {
      logger.error(`❌ Failed to translate to ${lang}:`, error.message);
      translations[lang] = { ...englishContent };
    }
  }

  return translations;
}

export const BLOG_FIELD_CONFIG = {
  title: { useGPT4: false },
  shortDescription: { useGPT4: false },
  detailDescription: { useGPT4: true },
};

export const YACHT_FIELD_CONFIG = {
  title: { useGPT4: false },
  dayCharter: { useGPT4: true },
  overnightCharter: { useGPT4: true },
  aboutThisBoat: { useGPT4: true },
  specifications: { useGPT4: true },
  boatLayout: { useGPT4: true },
};
