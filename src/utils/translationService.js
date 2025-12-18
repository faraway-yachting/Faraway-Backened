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

// Normalize slug to URL-friendly format (preserves Unicode for non-Latin languages)
function normalizeSlug(slug) {
  if (!slug) return '';
  
  // Check if slug is Latin-based (only ASCII letters, numbers, hyphens, spaces)
  const isLatinBased = /^[a-zA-Z0-9\s\-_]+$/.test(slug);
  
  let normalized = slug.trim();
  
  // Only lowercase for Latin-based slugs (preserve Unicode case)
  if (isLatinBased) {
    normalized = normalized.toLowerCase();
  }
  
  // Replace spaces, underscores, and multiple hyphens with single hyphen
  normalized = normalized
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Only remove truly problematic URL characters (preserve Unicode like Chinese, Arabic, Thai)
    .replace(/[<>"|\\^`{}[\]]/g, '');
  
  return normalized;
}

async function translateText(text, targetLanguage, useGPT4 = false, isSlug = false) {
  if (!text || !text.trim()) {
    return '';
  }

  if (!process.env.OPENAI_API_KEY) {
    logger.warn('⚠️ OPENAI_API_KEY not set, skipping translation');
    return isSlug ? normalizeSlug(text) : text;
  }

  try {
    const model = useGPT4 ? 'gpt-4' : 'gpt-4o-mini';
    const languageName = SUPPORTED_LANGUAGES[targetLanguage] || targetLanguage;

    // Special handling for slugs - request URL-friendly format
    const systemPrompt = isSlug
      ? `You are a professional translator. Translate the following English URL slug to ${languageName}. 

CRITICAL REQUIREMENTS:
1. You MUST translate the slug to ${languageName} - NEVER return the English version
2. For Latin-based languages (French, German, Russian): Use lowercase with hyphens (e.g., "guide-familial")
3. For non-Latin languages (Chinese, Arabic, Thai): Use native characters/script (e.g., Chinese: "家庭友好指南", Arabic: "دليل-عائلي")
4. Make it URL-friendly: lowercase, use hyphens for spaces, no special characters except hyphens
5. Return ONLY the translated slug, nothing else - no explanations, no English text

Example: English slug "family-friendly-guide" should become:
- French: "guide-familial"
- Chinese: "家庭友好指南" 
- Arabic: "دليل-عائلي"
- Thai: "คู่มือ-ครอบครัว"

Now translate: "${text}" to ${languageName}.`
      : `You are a professional translator. Translate the following text to ${languageName}. Maintain the same HTML structure, formatting, and style. Only return the translated text without any explanations or additional content.`;

    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0.3,
      max_tokens: useGPT4 ? 4000 : 1000,
    });

    let translatedText = response.choices[0]?.message?.content?.trim() || text;
    
    // Normalize slug if it's a slug field
    if (isSlug) {
      translatedText = normalizeSlug(translatedText);
    }
    
    return translatedText;
  } catch (error) {
    logger.error(`❌ Translation error for ${targetLanguage}:`, error?.message || error);
    // Propagate error so caller can decide whether to fail the whole operation
    throw error;
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

  // Translate all languages in parallel for maximum speed
  const languagePromises = targetLanguages
    .filter(lang => lang !== 'en')
    .map(async (lang) => {
      logger.info(`🔄 Translating to ${SUPPORTED_LANGUAGES[lang]}...`);
      try {
        // Translate all fields for this language in parallel
        const translationPromises = Object.keys(fieldConfig).map(async (fieldName) => {
          const config = fieldConfig[fieldName];
          const englishValue = englishContent[fieldName] || '';
          
          // Handle array fields (e.g., tags) by joining to a comma-separated string
          const isArrayField = Array.isArray(englishValue);
          const normalizedInput = isArrayField ? englishValue.join(', ') : englishValue;
          
          if (!normalizedInput) {
            return { fieldName, translatedValue: isArrayField ? [] : '' };
          }

          // Special handling for slug field - ensure URL-friendly format
          const isSlug = fieldName === 'slug';
          let translatedValue;
          try {
            translatedValue = await translateText(normalizedInput, lang, config.useGPT4 || false, isSlug);
          } catch (err) {
            logger.error(`❌ Field-level translation failed for ${lang}.${fieldName}:`, err?.message || err);
            // Fallback to English value for this field
            translatedValue = normalizedInput;
          }
          
          // For slugs, ensure we have a valid translated value (not empty, not same as English)
          if (isSlug) {
            const normalizedTranslated = normalizeSlug(translatedValue);
            const normalizedEnglish = normalizeSlug(normalizedInput);
            
            // If translation returned empty or same as English, retry with more explicit prompt
            if (!normalizedTranslated || normalizedTranslated === normalizedEnglish) {
              logger.warn(`⚠️ Slug translation for ${lang} returned empty or unchanged: "${translatedValue}". Retrying with explicit translation request...`);
              
              try {
                const retryPrompt = `Translate this English URL slug to ${SUPPORTED_LANGUAGES[lang]}: "${normalizedInput}". You MUST translate it to ${SUPPORTED_LANGUAGES[lang]}, do NOT return English. Return ONLY the translated slug in ${SUPPORTED_LANGUAGES[lang]} language, URL-friendly format.`;
                const retryResponse = await openai.chat.completions.create({
                  model: config.useGPT4 ? 'gpt-4' : 'gpt-4o-mini',
                  messages: [
                    { role: 'system', content: retryPrompt },
                    { role: 'user', content: normalizedInput },
                  ],
                  temperature: 0.3,
                  max_tokens: 200,
                });
                
                const retryTranslated = retryResponse.choices[0]?.message?.content?.trim() || '';
                const retryNormalized = normalizeSlug(retryTranslated);
                
                if (retryNormalized && retryNormalized !== normalizedEnglish) {
                  logger.info(`✅ Retry successful for ${lang} slug: "${retryNormalized}"`);
                  translatedValue = retryNormalized;
                } else {
                  logger.warn(`⚠️ Retry for ${lang} slug still unchanged/empty. Falling back to English slug.`);
                  translatedValue = normalizedEnglish;
                }
              } catch (retryError) {
                logger.warn(`⚠️ Retry translation failed for ${lang} slug. Falling back to English slug.`, retryError?.message || retryError);
                translatedValue = normalizedEnglish;
              }
            } else {
              translatedValue = normalizedTranslated;
            }
            
            return { fieldName, translatedValue: translatedValue };
          }
          
          // Convert back to array for array fields
          if (isArrayField) {
            const parts = (translatedValue || '').split(',').map(p => p.trim()).filter(Boolean);
            return { fieldName, translatedValue: parts.length ? parts : englishValue };
          }
          
          return { fieldName, translatedValue: translatedValue || englishValue };
        });

        const translationResults = await Promise.all(translationPromises);
        
        const translatedObject = {};
        translationResults.forEach(({ fieldName, translatedValue }) => {
          translatedObject[fieldName] = translatedValue;
        });

        logger.info(`✅ Translation to ${SUPPORTED_LANGUAGES[lang]} completed`);
        return { lang, translatedObject };
      } catch (error) {
        logger.error(`⚠️ Translation failed for ${lang}, using English fallback`, error?.message || error);
        // Fallback: use English content for this locale instead of failing
        return { lang, translatedObject: { ...englishContent } };
      }
    });

  // Wait for all languages to complete in parallel
  const languageResults = await Promise.all(languagePromises);
  
  // Build final translations object
  languageResults.forEach(({ lang, translatedObject }) => {
    translations[lang] = translatedObject;
  });

  return translations;
}

export const BLOG_FIELD_CONFIG = {
  slug: { useGPT4: false },
  title: { useGPT4: false },
  shortDescription: { useGPT4: false },
  detailDescription: { useGPT4: true },
};

export const YACHT_FIELD_CONFIG = {
  slug: { useGPT4: false },
  title: { useGPT4: false },
  dayCharter: { useGPT4: true },
  overnightCharter: { useGPT4: true },
  aboutThisBoat: { useGPT4: true },
  specifications: { useGPT4: true },
  boatLayout: { useGPT4: true },
  tags: { useGPT4: false }, // translate tag names; no GPT4 needed
};
