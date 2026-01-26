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

// Detect if text contains brand names, proper nouns, or technical terms that shouldn't be translated
// This function uses pattern-based detection to work with ANY yacht brand, not just hardcoded ones
function containsUntranslatableContent(text) {
  if (!text) return false;
  
  const trimmedText = text.trim();
  if (trimmedText.length === 0) return false;
  
  // Check for model numbers or codes (e.g., "98", "2024", "Model X", "2024ft", "98m")
  const modelPattern = /\b\d{2,}\b|\b[A-Z]\d+\b|\bModel\s+[A-Z0-9]+\b|\b\d+\s*(ft|feet|m|meters?|kg|tons?)\b/gi;
  if (modelPattern.test(text)) {
    return true;
  }
  
  // Extract words from text (handles both spaces and hyphens)
  const words = trimmedText.split(/[\s\-_]+/).filter(w => w.length > 0);
  if (words.length === 0) return false;
  
  // Check if first word starts with capital letter (common brand name pattern)
  // Examples: "Bilgin Yacht 98", "Sunseeker 75", "Princess V65"
  const firstWord = words[0];
  const startsWithCapital = /^[A-Z]/.test(firstWord);
  
  // Check for proper nouns (capitalized words) - these are likely brand names
  const properNounPattern = /\b[A-Z][a-z]+\b/g;
  const properNouns = text.match(properNounPattern) || [];
  
  // Pattern 1: Text starts with capitalized word (very likely a brand name)
  // Examples: "Bilgin", "Sunseeker", "Princess", "Ferretti"
  if (startsWithCapital && firstWord.length > 2) {
    // If it's a single capitalized word or followed by numbers/units, it's likely a brand
    if (words.length === 1 || /^\d+/.test(words[1]) || words.length <= 3) {
      return true;
    }
  }
  
  // Pattern 2: Multiple capitalized words (brand + model name)
  // Examples: "Bilgin Yacht", "Sunseeker Predator", "Princess V Class"
  if (properNouns.length >= 2) {
    return true;
  }
  
  // Pattern 3: Slug format with brand-like patterns
  // Examples: "bilgin-yacht-98", "sunseeker-75", "princess-v65"
  // If first word is longer than 3 chars and text contains numbers, likely brand+model
  if (firstWord.length > 3 && /-?\d+/.test(trimmedText)) {
    return true;
  }
  
  // Pattern 4: Check if text is mostly numbers and units (technical specs)
  const numberWords = words.filter(w => /^\d+/.test(w) || /^\d+[a-z]+$/i.test(w));
  const numberRatio = numberWords.length / words.length;
  if (numberRatio > 0.3 && words.length < 20) {
    return true; // High ratio of numbers suggests technical content
  }
  
  // Pattern 5: Common untranslatable patterns
  const untranslatablePatterns = [
    /\b(phuket|thailand|mediterranean|caribbean|bahamas|maldives|monaco|french|riviera|andaman)\b/i,
    /\b\d+\s*(knots?|ft|feet|m|meters?|kg|tons?|hp|kw|nm|nautical)\b/i,
    /\b(built|design|year|model|class|series)\s*:?\s*\d+/i,
    /\b\d{4}\b/, // Years like 2024, 2023
  ];
  
  for (const pattern of untranslatablePatterns) {
    if (pattern.test(text)) {
      return true;
    }
  }
  
  // Pattern 6: Short text with capitalized first word (likely brand name in title/slug)
  // Examples: "Bilgin", "Sunseeker", "Azimut"
  if (words.length <= 3 && startsWithCapital && firstWord.length >= 4) {
    return true;
  }
  
  return false;
}

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

// Estimate token count (rough approximation: ~4 characters per token)
function estimateTokens(text) {
  return Math.ceil((text?.length || 0) / 4);
}

async function translateText(text, targetLanguage, useGPT4 = false, isSlug = false) {
  if (!text || !text.trim()) {
    return '';
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set - translation cannot proceed');
  }

  const model = useGPT4 ? 'gpt-4o' : 'gpt-4o-mini';
  const languageName = SUPPORTED_LANGUAGES[targetLanguage] || targetLanguage;
  const inputTokens = estimateTokens(text);
  const systemPromptTokens = estimateTokens(isSlug ? 200 : 150); // Approximate system prompt size

  // Dynamic max_tokens calculation for large data
  // Both models have 128k context window, but max completion tokens are limited
  // gpt-4o: max 16,384 completion tokens
  // gpt-4o-mini: max 16,384 completion tokens
  const contextWindow = 128000;
  const safetyMargin = 5000; // Reserve for system messages and overhead
  const availableForOutput = contextWindow - inputTokens - systemPromptTokens - safetyMargin;
  
  // Model-specific max completion token limits
  const MAX_COMPLETION_TOKENS = 16384; // Both gpt-4o and gpt-4o-mini support max 16,384 completion tokens
  
  // Set max_tokens: ensure minimum, but don't exceed model's max completion tokens
  let maxTokens;
  if (useGPT4) {
    // For large HTML content, use more tokens but respect model limit
    maxTokens = Math.max(16000, Math.min(availableForOutput, MAX_COMPLETION_TOKENS));
  } else {
    // For shorter fields, use reasonable default
    maxTokens = Math.max(8000, Math.min(availableForOutput, MAX_COMPLETION_TOKENS));
  }

  // Detect if content is short (likely title or short text)
  const isShortContent = text.length < 100;
  
  const systemPrompt = isSlug
    ? `Translate this English URL slug to ${languageName}. 

English slug: "${text}"

IMPORTANT RULES:
1. Translate descriptive words to ${languageName}
2. KEEP brand names, proper nouns, and model numbers UNCHANGED (e.g., "Bilgin", "98", "2024")
3. Translate common words like "yacht", "luxury", "cruise", "family", etc.
4. Use lowercase letters
5. Use hyphens (-) to separate words
6. Return ONLY the translated slug, nothing else

Translation examples:
- English "luxury-yacht" → French "yacht-de-luxe" → German "luxusyacht" → Russian "роскошная-яхта" → Chinese "豪华游艇"
- English "family-friendly" → French "familial" → German "familienfreundlich" → Arabic "صديق-للأسرة" → Thai "เหมาะสำหรับครอบครัว"
- English "bilgin-yacht-98" → French "bilgin-yacht-98" (keep brand name and number) → German "bilgin-yacht-98"
- English "sunset-cruise" → French "croisiere-coucher-soleil" → German "sonnenuntergang-kreuzfahrt" → Arabic "رحلة-غروب-الشمس"

Now translate "${text}" to ${languageName}:
[Return ONLY the ${languageName} translation, no English text]`
    : isShortContent
    ? `You are a professional translator. Translate the following English text to ${languageName}.

IMPORTANT RULES:
1. Translate descriptive words to ${languageName}
2. KEEP brand names, proper nouns, and model numbers UNCHANGED (e.g., "Bilgin", "Sunseeker", "98", "2024")
3. Translate common words like "Luxury", "Yacht", "Family", "Friendly", etc.

Examples:
- English: "Luxury Yacht" → French: "Yacht de Luxe" → German: "Luxusyacht" → Chinese: "豪华游艇"
- English: "Family Friendly" → French: "Familial" → German: "Familienfreundlich" → Arabic: "صديق للأسرة"
- English: "Bilgin Yacht 98" → French: "Yacht Bilgin 98" (keep brand name and number) → German: "Bilgin Yacht 98"

INPUT: "${text}"
TARGET: ${languageName}

Return ONLY the translated text in ${languageName}, nothing else.`
    : `You are a professional translator. Translate the following text to ${languageName}.

CRITICAL REQUIREMENTS:
1. Translate descriptive text to ${languageName}
2. KEEP brand names, proper nouns, model numbers, and technical specifications UNCHANGED (e.g., "Bilgin", "Sunseeker", "98ft", "2024", "30 knots")
3. Maintain the exact same HTML structure, formatting, and style
4. Translate ALL content including table headers, labels, and text within HTML tags
5. Only return the translated text without any explanations or additional content
6. Ensure the translation is complete and accurate

Return ONLY the translated text in ${languageName}.`;

  // Retry logic with exponential backoff
  const isConnectionError = (error) => {
    return error?.message?.toLowerCase().includes('connection') ||
           error?.code === 'ECONNRESET' ||
           error?.code === 'ETIMEDOUT' ||
           error?.code === 'ENOTFOUND';
  };
  
  const maxRetries = 5;
  const timeout = Math.max(120000, Math.min(inputTokens * 50, 600000)); // Dynamic timeout: 50ms per token, min 120s, max 600s (10 minutes)
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await openai.chat.completions.create(
        {
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text },
          ],
          temperature: 0.3,
          max_tokens: maxTokens,
        },
        { timeout }
      );

      const translatedText = response.choices[0]?.message?.content?.trim();
      
      if (!translatedText) {
        throw new Error(`Translation returned empty result for ${languageName}`);
      }
      
      return isSlug ? normalizeSlug(translatedText) : translatedText;
    } catch (apiError) {
      const isRetryable = 
        isConnectionError(apiError) ||
        apiError?.message?.toLowerCase().includes('timeout') ||
        (apiError?.response?.status >= 500 && apiError?.response?.status < 600) ||
        apiError?.response?.status === 429;
      
      if (isRetryable && attempt < maxRetries) {
        // Faster backoff: 1s, 2s, 4s, 8s, 16s (reduced from 2s, 4s, 8s, 16s, 32s)
        const baseDelay = Math.pow(2, attempt - 1) * 1000;
        const jitter = Math.random() * 500; // Reduced jitter
        const delay = baseDelay + jitter;
        logger.warn(`⚠️ Retryable error for ${languageName} (attempt ${attempt}/${maxRetries}), retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Handle specific errors
      if (apiError?.response?.status === 429) {
        throw new Error(`OpenAI API rate limit exceeded for ${languageName}. Please try again later.`);
      } else if (apiError?.response?.status === 401) {
        throw new Error(`OpenAI API authentication failed. Please check API key.`);
      } else if (apiError?.response?.status === 500) {
        throw new Error(`OpenAI API server error for ${languageName}. Please try again later.`);
      } else if (apiError?.code === 'insufficient_quota') {
        throw new Error(`OpenAI API quota exceeded. Please check your account.`);
      } else if (apiError?.message) {
        throw new Error(`OpenAI API error for ${languageName}: ${apiError.message}`);
      } else {
        throw new Error(`Unknown error translating to ${languageName}: ${String(apiError)}`);
      }
    }
  }
}

function validateTranslation(translated, english, fieldName, lang, isSlug = false) {
  if (!translated || !translated.trim()) {
    throw new Error(`Translation for ${lang}.${fieldName} returned empty`);
  }

  // Check if content contains untranslatable elements (brand names, proper nouns, technical terms)
  const hasUntranslatable = containsUntranslatableContent(english);

  if (isSlug) {
    const normalizedTranslated = normalizeSlug(translated);
    const normalizedEnglish = normalizeSlug(english);
    
    // Allow identical slugs if they contain brand names or proper nouns
    if (normalizedTranslated === normalizedEnglish) {
      if (hasUntranslatable) {
        // This is acceptable - brand names should stay the same
        logger.info(`✓ Allowing identical slug for ${lang}.${fieldName} (contains brand name/proper noun): "${normalizedEnglish}"`);
        return normalizedTranslated;
      }
      throw new Error(`Translation for ${lang}.${fieldName} (slug) is identical to English`);
    }
    return normalizedTranslated;
  }

  // Extract and clean text for comparison
  const extractText = (html) => {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  };

  const removeNumbersAndSymbols = (text) => {
    return text
      .replace(/\d+/g, '')
      .replace(/[,\$€£¥₹THB%:;.,!?\-_=+()]/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const cleanTranslated = extractText(translated);
  const cleanEnglish = extractText(english);
  const textOnlyTranslated = removeNumbersAndSymbols(cleanTranslated);
  const textOnlyEnglish = removeNumbersAndSymbols(cleanEnglish);
  
  // For content fields, be more lenient
  // Only check for identical if text is substantial and doesn't contain untranslatable content
  if (textOnlyTranslated === textOnlyEnglish && textOnlyTranslated.length > 10) {
    if (hasUntranslatable) {
      // Allow identical if it contains brand names/technical terms
      logger.info(`✓ Allowing identical content for ${lang}.${fieldName} (contains brand name/technical term)`);
      return translated;
    }
    // For short content, be more lenient (might be titles or technical terms)
    if (textOnlyTranslated.length < 50) {
      logger.warn(`⚠️ Translation for ${lang}.${fieldName} is identical but short (${textOnlyTranslated.length} chars), allowing it`);
      return translated;
    }
    throw new Error(`Translation for ${lang}.${fieldName} appears identical to English`);
  }

  // Use more lenient similarity threshold for descriptions
  const similarity = calculateSimilarity(cleanTranslated, cleanEnglish);
  const similarityThreshold = hasUntranslatable ? 0.98 : 0.97; // More lenient if contains brand names
  const minLengthForSimilarityCheck = hasUntranslatable ? 100 : 50; // Longer content needed if has brand names
  
  if (similarity > similarityThreshold && cleanTranslated.length > minLengthForSimilarityCheck) {
    if (hasUntranslatable) {
      // High similarity is acceptable if content contains brand names/technical terms
      logger.info(`✓ Allowing high similarity (${(similarity * 100).toFixed(1)}%) for ${lang}.${fieldName} (contains brand name/technical term)`);
      return translated;
    }
    throw new Error(`Translation for ${lang}.${fieldName} is ${(similarity * 100).toFixed(1)}% similar to English`);
  }

  return translated;
}

// Calculate similarity ratio between two strings (0 = completely different, 1 = identical)
function calculateSimilarity(str1, str2) {
  if (str1 === str2) return 1;
  if (str1.length === 0 || str2.length === 0) return 0;
  
  // Use Levenshtein distance for similarity
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

// Calculate Levenshtein distance between two strings
function levenshteinDistance(str1, str2) {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}

/**
 * Translate content to a single language
 * This function handles all fields for one language independently
 * Can be run in parallel with other language translations
 */
async function translateToLanguage(lang, englishContent, fieldConfig) {
  logger.info(`🔄 Translating to ${SUPPORTED_LANGUAGES[lang]}...`);
  
  try {
    const fieldNames = Object.keys(fieldConfig);
    const translatedObject = {};
    let hasFailures = false;
    let hasFallbacks = false;
    
    // Process fields sequentially within each language to avoid API overload
    // Each language runs independently, so we can process all languages in parallel
    for (const fieldName of fieldNames) {
      const config = fieldConfig[fieldName];
      const englishValue = englishContent[fieldName] || '';
      const isArrayField = Array.isArray(englishValue);
      const normalizedInput = isArrayField ? englishValue.join(', ') : englishValue;
      
      if (!normalizedInput || !normalizedInput.trim()) {
        translatedObject[fieldName] = isArrayField ? [] : '';
        continue;
      }

      const isSlug = fieldName === 'slug';
      // ALWAYS use gpt-4o for slugs for better translation quality
      const useGPT4ForField = isSlug ? true : (config.useGPT4 || false);
      
      // Retry logic for identical translations (API sometimes returns English)
      let translatedValue;
      let lastError;
      const maxRetries = 3; // Retry twice if translation is identical
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Always use gpt-4o for slugs, use config for other fields
          translatedValue = await translateText(normalizedInput, lang, useGPT4ForField, isSlug);
          
          // Log what we got for debugging
          if (attempt > 1) {
            logger.info(`🔄 Retry ${attempt} for ${lang}.${fieldName} returned: "${translatedValue.substring(0, 50)}..."`);
          }
          
          translatedValue = validateTranslation(translatedValue, normalizedInput, fieldName, lang, isSlug);
          
          // If we get here, validation passed - translation is good
          translatedObject[fieldName] = isArrayField 
            ? translatedValue.split(',').map(p => p.trim()).filter(Boolean) 
            : translatedValue;
          break; // Success, exit retry loop
        } catch (err) {
          lastError = err;
          const isIdenticalError = err?.message?.includes('identical') || err?.message?.includes('similar');
          
          // If translation is identical and we have retries left, wait and retry
          if (isIdenticalError && attempt < maxRetries) {
            logger.warn(`⚠️ Translation for ${lang}.${fieldName} returned identical text (attempt ${attempt}/${maxRetries}), retrying...`, {
              input: normalizedInput.substring(0, 100),
              received: err?.message,
              usingGPT4: useGPT4ForField
            });
            await new Promise(resolve => setTimeout(resolve, 1500 * attempt)); // Exponential backoff: 1.5s, 3s
            continue;
          }
          
          // If all retries exhausted, fallback to English instead of failing
          logger.warn(`⚠️ Translation failed for ${lang}.${fieldName} after ${attempt} attempts, using English as fallback:`, {
            error: err?.message || String(err),
            fieldName,
            language: SUPPORTED_LANGUAGES[lang],
            inputLength: normalizedInput?.length || 0,
            isSlug,
            useGPT4: useGPT4ForField
          });
          
          // Fallback to English content for this field
          translatedObject[fieldName] = isArrayField ? englishValue : normalizedInput;
          hasFailures = true;
          hasFallbacks = true;
          break; // Exit retry loop, use fallback
        }
      }
    }

    if (hasFallbacks) {
      logger.warn(`⚠️ Translation to ${SUPPORTED_LANGUAGES[lang]} completed with some fields using English fallback`);
    } else if (hasFailures) {
      logger.warn(`⚠️ Translation to ${SUPPORTED_LANGUAGES[lang]} completed with some failures`);
    } else {
      logger.info(`✅ Translation to ${SUPPORTED_LANGUAGES[lang]} completed`);
    }
    
    return { lang, translatedObject, hasFailures, hasFallbacks };
  } catch (error) {
    // If language translation completely fails, use English as fallback for all fields
    logger.error(`❌ Translation failed for language ${SUPPORTED_LANGUAGES[lang]}, using English fallback:`, error?.message || error);
    
    const fallbackObject = {};
    const fieldNames = Object.keys(fieldConfig);
    fieldNames.forEach(fieldName => {
      const englishValue = englishContent[fieldName] || '';
      const isArrayField = Array.isArray(englishValue);
      fallbackObject[fieldName] = isArrayField ? englishValue : englishValue;
    });
    
    return { lang, translatedObject: fallbackObject, hasFailures: true, hasFallbacks: true };
  }
}

/**
 * Translate content to French
 * Separate function for parallel execution
 */
async function translateToFrench(englishContent, fieldConfig) {
  return translateToLanguage('fr', englishContent, fieldConfig);
}

/**
 * Translate content to German
 * Separate function for parallel execution
 */
async function translateToGerman(englishContent, fieldConfig) {
  return translateToLanguage('de', englishContent, fieldConfig);
}

/**
 * Translate content to Russian
 * Separate function for parallel execution
 */
async function translateToRussian(englishContent, fieldConfig) {
  return translateToLanguage('ru', englishContent, fieldConfig);
}

/**
 * Translate content to Chinese
 * Separate function for parallel execution
 */
async function translateToChinese(englishContent, fieldConfig) {
  return translateToLanguage('zh', englishContent, fieldConfig);
}

/**
 * Translate content to Thai
 * Separate function for parallel execution
 */
async function translateToThai(englishContent, fieldConfig) {
  return translateToLanguage('th', englishContent, fieldConfig);
}

/**
 * Translate content to Arabic
 * Separate function for parallel execution
 */
async function translateToArabic(englishContent, fieldConfig) {
  return translateToLanguage('ar', englishContent, fieldConfig);
}

export async function translateContent(englishContent, fieldConfig, targetLanguages = DEFAULT_TARGET_LANGUAGES) {
  if (!englishContent || typeof englishContent !== 'object') {
    throw new Error('Invalid English content provided for translation');
  }

  const translations = { en: { ...englishContent } };
  const targetLangs = targetLanguages.filter(lang => lang !== 'en');
  
  logger.info(`🌐 Starting translation to ${targetLangs.length} languages in parallel...`);

  // Create language-specific translation functions
  const languageFunctions = {
    fr: translateToFrench,
    de: translateToGerman,
    ru: translateToRussian,
    zh: translateToChinese,
    th: translateToThai,
    ar: translateToArabic,
  };

  // Build array of translation promises for all target languages
  // All languages run in parallel - this is much faster than sequential or batched processing
  const translationPromises = targetLangs
    .filter(lang => languageFunctions[lang]) // Only include supported languages
    .map(lang => languageFunctions[lang](englishContent, fieldConfig));

  // Execute all language translations in parallel using Promise.allSettled
  // This ensures that if one language fails, others can still complete
  const languageResults = await Promise.allSettled(translationPromises);
  
  // Build final translations object and track overall status
  let totalFailures = 0;
  let totalFallbacks = 0;
  
  languageResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const { lang, translatedObject, hasFailures, hasFallbacks } = result.value;
      translations[lang] = translatedObject;
      if (hasFailures) totalFailures++;
      if (hasFallbacks) totalFallbacks++;
    } else {
      // If a language translation promise was rejected, use English fallback
      const lang = targetLangs[index];
      logger.error(`❌ Translation promise rejected for ${SUPPORTED_LANGUAGES[lang]}, using English fallback:`, result.reason);
      
      const fallbackObject = {};
      const fieldNames = Object.keys(fieldConfig);
      fieldNames.forEach(fieldName => {
        const englishValue = englishContent[fieldName] || '';
        const isArrayField = Array.isArray(englishValue);
        fallbackObject[fieldName] = isArrayField ? englishValue : englishValue;
      });
      
      translations[lang] = fallbackObject;
      totalFailures++;
      totalFallbacks++;
    }
  });

  if (totalFallbacks > 0) {
    logger.warn(`⚠️ Translation completed: ${totalFallbacks} language(s) used English fallback for some fields`);
  } else if (totalFailures > 0) {
    logger.warn(`⚠️ Translation completed: ${totalFailures} language(s) had some translation issues`);
  } else {
    logger.info(`✅ All translations completed successfully`);
  }

  return translations;
}

export const BLOG_FIELD_CONFIG = {
  slug: { useGPT4: false },
  title: { useGPT4: false },
  shortDescription: { useGPT4: false },
  detailDescription: { useGPT4: true },
};

export const YACHT_FIELD_CONFIG = {
  slug: { useGPT4: false }, // Note: Code forces gpt-4o for slugs regardless of this setting
  title: { useGPT4: false },
  dayCharter: { useGPT4: true },
  overnightCharter: { useGPT4: true },
  aboutThisBoat: { useGPT4: true },
  specifications: { useGPT4: true },
  boatLayout: { useGPT4: true },
  tags: { useGPT4: false }, // translate tag names; no GPT4 needed
};
