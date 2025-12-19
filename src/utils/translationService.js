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

YOU MUST TRANSLATE IT. DO NOT COPY THE ENGLISH TEXT.

English slug: "${text}"

Rules:
1. Translate EVERY word to ${languageName}
2. Even if it's a proper noun or seems untranslatable, find the ${languageName} equivalent
3. Use lowercase letters
4. Use hyphens (-) to separate words
5. Return ONLY the translated slug, nothing else

Translation examples:
- English "luxury-yacht" → French "yacht-de-luxe" → German "luxusyacht" → Russian "роскошная-яхта" → Chinese "豪华游艇"
- English "family-friendly" → French "familial" → German "familienfreundlich" → Arabic "صديق-للأسرة" → Thai "เหมาะสำหรับครอบครัว"
- English "sunset-cruise" → French "croisiere-coucher-soleil" → German "sonnenuntergang-kreuzfahrt" → Arabic "رحلة-غروب-الشمس"

Now translate "${text}" to ${languageName}:
[Return ONLY the ${languageName} translation, no English text]`
    : isShortContent
    ? `You are a professional translator. Translate the following English text to ${languageName}.

MANDATORY: You MUST translate ALL words to ${languageName}. NEVER return English text unchanged. If you return English, the translation has FAILED.

Examples:
- English: "Luxury Yacht" → French: "Yacht de Luxe" → German: "Luxusyacht" → Chinese: "豪华游艇"
- English: "Family Friendly" → French: "Familial" → German: "Familienfreundlich" → Arabic: "صديق للأسرة"

INPUT: "${text}"
TARGET: ${languageName}

Return ONLY the translated text in ${languageName}, nothing else.`
    : `You are a professional translator. Translate the following text to ${languageName}.

CRITICAL REQUIREMENTS:
1. You MUST translate ALL text to ${languageName} - NEVER return English text
2. Maintain the exact same HTML structure, formatting, and style
3. Translate ALL content including table headers, labels, and text within HTML tags
4. Only return the translated text without any explanations or additional content
5. Ensure the translation is complete and accurate

Return ONLY the translated text in ${languageName}.`;

  // Retry logic with exponential backoff
  const isConnectionError = (error) => {
    return error?.message?.toLowerCase().includes('connection') ||
           error?.code === 'ECONNRESET' ||
           error?.code === 'ETIMEDOUT' ||
           error?.code === 'ENOTFOUND';
  };
  
  const maxRetries = 5;
  const timeout = Math.max(120000, Math.min(inputTokens * 50, 300000)); // Dynamic timeout: 50ms per token, min 120s, max 300s
  
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

  if (isSlug) {
    const normalizedTranslated = normalizeSlug(translated);
    const normalizedEnglish = normalizeSlug(english);
    if (normalizedTranslated === normalizedEnglish) {
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
  
  if (textOnlyTranslated === textOnlyEnglish && textOnlyTranslated.length > 10) {
    throw new Error(`Translation for ${lang}.${fieldName} appears identical to English`);
  }

  const similarity = calculateSimilarity(cleanTranslated, cleanEnglish);
  if (similarity > 0.95 && cleanTranslated.length > 50) {
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

export async function translateContent(englishContent, fieldConfig, targetLanguages = DEFAULT_TARGET_LANGUAGES) {
  if (!englishContent || typeof englishContent !== 'object') {
    throw new Error('Invalid English content provided for translation');
  }

  const translations = { en: { ...englishContent } };
  const targetLangs = targetLanguages.filter(lang => lang !== 'en');
  
  logger.info(`🌐 Starting translation to ${targetLangs.length} languages`);

  // Global concurrency limiter to prevent API overload
  // This allows parallel processing while maintaining reliability
  class ConcurrencyLimiter {
    constructor(maxConcurrent) {
      this.maxConcurrent = maxConcurrent;
      this.running = 0;
      this.queue = [];
    }

    async execute(task) {
      return new Promise((resolve, reject) => {
        this.queue.push({ task, resolve, reject });
        this.process();
      });
    }

    async process() {
      if (this.running >= this.maxConcurrent || this.queue.length === 0) {
        return;
      }

      this.running++;
      const { task, resolve, reject } = this.queue.shift();

      try {
        const result = await task();
        resolve(result);
      } catch (error) {
        reject(error);
      } finally {
        this.running--;
        this.process();
      }
    }
  }

  // Global limiter: max 6 concurrent API calls across all languages and fields
  const globalLimiter = new ConcurrencyLimiter(6);

  // Process fields with higher concurrency (3 at a time per language)
  const limitConcurrency = async (tasks, limit) => {
    const results = [];
    for (let i = 0; i < tasks.length; i += limit) {
      const batch = tasks.slice(i, i + limit);
      const batchResults = await Promise.all(batch.map(task => globalLimiter.execute(task)));
      results.push(...batchResults);
      // Reduced delay between batches
      if (i + limit < tasks.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    return results;
  };

  // Process languages in parallel (2 at a time) for speed
  // This is much faster than sequential while still being reliable
  const languageTasks = targetLangs.map((lang, index) => async () => {
    // Stagger language starts slightly to avoid thundering herd
    if (index > 0) {
      await new Promise(resolve => setTimeout(resolve, 200 * index));
    }
    
    logger.info(`🔄 Translating to ${SUPPORTED_LANGUAGES[lang]}...`);
    
    try {
      const fieldNames = Object.keys(fieldConfig);
      const fieldTasks = fieldNames.map(fieldName => async () => {
        const config = fieldConfig[fieldName];
        const englishValue = englishContent[fieldName] || '';
        const isArrayField = Array.isArray(englishValue);
        const normalizedInput = isArrayField ? englishValue.join(', ') : englishValue;
        
        if (!normalizedInput || !normalizedInput.trim()) {
          return { fieldName, translatedValue: isArrayField ? [] : '' };
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
            break;
          } catch (err) {
            lastError = err;
            const isIdenticalError = err?.message?.includes('identical') || err?.message?.includes('similar');
            
            // If translation is identical and we have retries left, wait and retry
            if (isIdenticalError && attempt < maxRetries) {
              logger.warn(`⚠️ Translation for ${lang}.${fieldName} returned identical text (attempt ${attempt}/${maxRetries}), retrying...`, {
                input: normalizedInput,
                received: err?.message,
                usingGPT4: useGPT4ForField
              });
              await new Promise(resolve => setTimeout(resolve, 1500 * attempt)); // Exponential backoff: 1.5s, 3s
              continue;
            }
            
            // If not identical error or no retries left, throw
            logger.error(`❌ Translation failed for ${lang}.${fieldName}:`, {
              error: err?.message || String(err),
              fieldName,
              language: SUPPORTED_LANGUAGES[lang],
              inputLength: normalizedInput?.length || 0,
              input: normalizedInput,
              isSlug,
              useGPT4: useGPT4ForField,
              attempt
            });
            throw new Error(`Failed to translate ${fieldName} to ${SUPPORTED_LANGUAGES[lang]}: ${err?.message || String(err)}`);
          }
        }
        
        if (!translatedValue) {
          throw lastError || new Error(`Translation failed for ${fieldName} to ${SUPPORTED_LANGUAGES[lang]}`);
        }
        
        if (isArrayField) {
          const parts = translatedValue.split(',').map(p => p.trim()).filter(Boolean);
          return { fieldName, translatedValue: parts.length > 0 ? parts : [] };
        }
        
        return { fieldName, translatedValue };
      });

      // Increased field concurrency to 3 for speed
      const translationResults = await limitConcurrency(fieldTasks, 3);
      const translatedObject = {};
      translationResults.forEach(({ fieldName, translatedValue }) => {
        translatedObject[fieldName] = translatedValue;
      });

      logger.info(`✅ Translation to ${SUPPORTED_LANGUAGES[lang]} completed`);
      return { lang, translatedObject };
    } catch (error) {
      logger.error(`❌ Translation failed for language ${SUPPORTED_LANGUAGES[lang]}:`, error?.message || error);
      throw error;
    }
  });

  // Process 2 languages in parallel for speed
  const languageResults = await limitConcurrency(languageTasks, 2);
  
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
  slug: { useGPT4: false }, // Note: Code forces gpt-4o for slugs regardless of this setting
  title: { useGPT4: false },
  dayCharter: { useGPT4: true },
  overnightCharter: { useGPT4: true },
  aboutThisBoat: { useGPT4: true },
  specifications: { useGPT4: true },
  boatLayout: { useGPT4: true },
  tags: { useGPT4: false }, // translate tag names; no GPT4 needed
};
