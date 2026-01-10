import Yacht from '../models/yacht.js';
import ApiError from '../utils/ApiError.js';
import SuccessHandler from '../utils/SuccessHandler.js';

import { clearYachtCache } from '../utils/cache.js';
import { uploadToCloudinary } from '../utils/cloudinaryUtil.js';
import mapImageFilenamesToUrls from '../utils/mapImageFilenamesToUrls.js';
import paginate from '../utils/paginate.js';
import {
  addyachtSchema,
  editYachtSchema,
  getAllYachtsSchema,
  getYachtByIdSchema,
  getYachtBySlugSchema,
} from '../validations/yacht.validation.js';
import { processTranslations } from '../utils/translationHelper.js';
import { YACHT_FIELD_CONFIG } from '../utils/translationService.js';

const normalizeSlug = (value) =>
  value
    ?.trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

const isValidSlug = (value) => /^[a-z0-9-]+$/.test(value || '');

const getSlugOrFail = (data) => {
  const rawSlug = data?.translations?.en?.slug || data?.slug;
  const normalized = normalizeSlug(rawSlug);
  if (!normalized) {
    throw new ApiError('Slug is required', 400);
  }
  if (!isValidSlug(normalized)) {
    throw new ApiError('Slug can only contain lowercase letters, numbers, and hyphens', 400);
  }
  return normalized;
};

// Add a new yacht
export const addYacht = async (req, res, next) => {
  // Set keep-alive headers to prevent connection timeout during long translations
  res.set('Connection', 'keep-alive');
  res.set('Keep-Alive', 'timeout=1200'); // 20 minutes
  
  try {
    let yachtData = req.body;

    // Parse translations if sent as JSON string (multipart/form-data)
    if (yachtData?.translations && typeof yachtData.translations === 'string') {
      try {
        yachtData.translations = JSON.parse(yachtData.translations);
      } catch (err) {
        return next(new ApiError('Invalid translations format', 400));
      }
    }

    // Check if primary image is uploaded
    if (!req.files || !req.files.primaryImage || !req.files.primaryImage[0]) {
      return next(new ApiError('Primary image is required', 400));
    }

    // Upload primaryImage to Cloudinary
    if (req.files && req.files.primaryImage && req.files.primaryImage[0]) {
      try {
        const file = req.files.primaryImage[0];

        // Check file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB in bytes
        if (file.size > maxSize) {
          return next(
            new ApiError(
              `Primary image file size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size of 10MB`,
              400
            )
          );
        }

        console.log(`📸 Uploading primary image: ${file.originalname}`);

        // Small delay to ensure file is fully written
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify file exists before uploading
        const fs = await import('fs/promises');
        try {
          await fs.access(file.path);
          // Get file stats to verify it's not empty
          const stats = await fs.stat(file.path);

          if (stats.size === 0) {
            return next(new ApiError('Primary image file is empty', 400));
          }
        } catch (accessError) {
          console.error('❌ Primary image file access error');
          return next(new ApiError('Primary image file not found', 500));
        }

        yachtData.primaryImage = await uploadToCloudinary(
          file.path,
          'yachts/primaryImage'
        );
        console.log('✅ Primary image uploaded successfully');
      } catch (uploadError) {
        console.error('❌ Primary image upload failed');
        return next(new ApiError('Failed to upload primary image', 400));
      }
    }

    // Upload galleryImages to Cloudinary
    const galleryImageFiles = [
      ...(req.files?.galleryImages || []),
      ...(req.files?.['galleryImages[]'] || []),
    ];

    console.log(`🖼️ Gallery images found: ${galleryImageFiles.length}`);

    if (galleryImageFiles.length > 0) {
      // Validate file sizes first (before upload)
      const fs = await import('fs/promises');
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      for (const file of galleryImageFiles) {
        if (file.size > maxSize) {
          return next(
            new ApiError(
              `Gallery image file size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size of 10MB`,
              400
            )
          );
        }
      }

      // Upload images in parallel for better performance
      console.log(`🖼️ Uploading ${galleryImageFiles.length} gallery images in parallel...`);
      const uploadPromises = galleryImageFiles.map(async (file) => {
        try {
          // Check if file exists
          await fs.access(file.path);
          console.log(`📸 Uploading gallery image: ${file.originalname}`);
          const url = await uploadToCloudinary(
            file.path,
            'yachts/galleryImages'
          );
          console.log('✅ Gallery image uploaded successfully');
          return url;
        } catch (uploadError) {
          console.error(`❌ Gallery image ${file.originalname} upload failed:`, uploadError);
          throw uploadError;
        }
      });
      
      try {
        // Wait for all uploads (parallel execution is much faster)
        const uploadResults = await Promise.allSettled(uploadPromises);
        yachtData.galleryImages = [];
        uploadResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            yachtData.galleryImages.push(result.value);
          } else {
            console.error(`Gallery image ${galleryImageFiles[index].originalname} upload failed:`, result.reason);
            // Continue with other images even if one fails
          }
        });
        console.log(`✅ Successfully uploaded ${yachtData.galleryImages.length}/${galleryImageFiles.length} gallery images`);
      } catch (uploadError) {
        return next(
          new ApiError(
            `Failed to upload gallery images: ${uploadError.message}`,
            400
          )
        );
      }
    }

    // Derive canonical slug from English translation and enforce presence of translations
    try {
      const canonicalSlug = getSlugOrFail(yachtData);
      if (!yachtData.translations || !yachtData.translations.en) {
        return next(new ApiError('English translations (translations.en) are required', 400));
      }
      yachtData.translations.en.slug = canonicalSlug;
      yachtData.slug = canonicalSlug; // keep top-level slug for backward compatibility
    } catch (slugError) {
      return next(slugError);
    }

    // Build English source for translation - ensure empty strings are preserved
    const en = yachtData.translations.en;
    const englishSource = {
      slug: en.slug || '',
      title: en.title || '',
      dayCharter: en.dayCharter || '',
      overnightCharter: en.overnightCharter || '',
      aboutThisBoat: en.aboutThisBoat || '',
      specifications: en.specifications || '',
      boatLayout: en.boatLayout || '',
      tags: en.tags || yachtData.tags || [],
    };

    // Run Joi validation after slug + translations are normalized
    const { error } = addyachtSchema.validate({
      ...yachtData,
      translations: yachtData.translations,
    });
    if (error) {
      return next(new ApiError(error.details[0].message, 400));
    }

    // Enforce slug uniqueness based on canonical English slug
    const existingSlug = await Yacht.findOne({ slug: yachtData.slug })
      .lean()
      .exec();
    if (existingSlug) {
      return next(new ApiError('Yacht with this slug already exists', 409));
    }

    // Auto-translate to all configured locales
    // Add timeout protection (max 5 minutes for translation)
    let translations;
    try {
      const translationPromise = processTranslations(englishSource, YACHT_FIELD_CONFIG);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Translation timeout after 5 minutes')), 300000)
      );
      
      translations = await Promise.race([translationPromise, timeoutPromise]);
    } catch (translationError) {
      console.error('❌ Translation error during yacht creation:', translationError);
      return next(
        new ApiError(
          'Failed to translate yacht content. Please try again later.',
          502
        )
      );
    }

    // Ensure empty strings are preserved and status defaults to draft
    const yachtToCreate = {
      ...yachtData,
      slug: englishSource.slug,
      translations,
      // Ensure optional fields are empty strings if not provided
      videoLink: yachtData.videoLink || '',
      badge: yachtData.badge || '',
      design: yachtData.design || '',
      built: yachtData.built || '',
      cruisingSpeed: yachtData.cruisingSpeed || '',
      lengthOverall: yachtData.lengthOverall || '',
      fuelCapacity: yachtData.fuelCapacity || '',
      waterCapacity: yachtData.waterCapacity || '',
      code: yachtData.code || '',
      // Ensure status defaults to draft if not provided
      status: yachtData.status || 'draft',
      // Ensure displayOrder defaults to 9999 if not provided
      displayOrder: yachtData.displayOrder ?? 9999,
    };

    const newYacht = await Yacht.create(yachtToCreate);
    // Invalidate caches so lists reflect the new yacht
    await clearYachtCache();
    // Map image filenames to URLs and return new yacht
    const yachtWithUrls = mapImageFilenamesToUrls(newYacht, req);
    return SuccessHandler(yachtWithUrls, 201, 'Yacht added successfully', res);
  } catch (err) {
    if (
      err &&
      err.code === 11000 &&
      (err.keyPattern?.slug || err.keyValue?.slug)
    ) {
      return next(new ApiError('Yacht with this slug already exists', 409));
    }
    next(new ApiError(err.message, 400));
  }
};

// Get all yachts
export const getAllYachts = async (req, res, next) => {
  try {
    // Validate query parameters
    const { error } = getAllYachtsSchema.validate(req.query);
    if (error) {
      return next(new ApiError(error.details[0].message, 400));
    }
    const { page = 1, limit = 10, status } = req.query;
    const { skip, limit: parsedLimit } = paginate(page, limit);

    // Build query filter
    const filter = {};
    if (status && ['draft', 'published'].includes(status)) {
      filter.status = status;
    }
    // Note: If no status filter, returns all yachts (for admin panel)
    // Frontend should explicitly request status=published for better performance

    // Lightweight projection for list responses to reduce payload size on slow networks
    // Include translations for multilingual support (yacht titles need to be translated)
    const listProjection = {
      boatType: 1,
      price: 1,
      capacity: 1,
      length: 1,
      lengthRange: 1,
      title: 1,
      cabins: 1,
      bathrooms: 1,
      passengerDayTrip: 1,
      passengerOvernight: 1,
      guests: 1,
      guestsRange: 1,
      dayTripPrice: 1,
      overnightPrice: 1,
      daytripPriceEuro: 1,
      primaryImage: 1,
      badge: 1,
      slug: 1,
      type: 1,
      status: 1,
      updatedAt: 1,
      createdAt: 1,
      tags: 1,
      translations: 1, // Include translations for multilingual yacht titles
      displayOrder: 1, // Include displayOrder for custom sorting
    };

    // Use Promise.all for parallel execution
    // Sort order: displayOrder (ascending: 1, 2, 3...), then updatedAt (descending), then createdAt (descending)
    // Lower displayOrder numbers appear first (1 = first, 2 = second, etc.)
    // Handle null/undefined displayOrder by treating them as 9999 (appear last)
    // Optimized sort to match compound index: { status: 1, displayOrder: 1, updatedAt: -1 }
    const sortOrder = { 
      displayOrder: 1, // Ascending: 1, 2, 3... (null/undefined treated as 0, but default is 9999)
      updatedAt: -1, 
      createdAt: -1 
    };
    
    const [yachts, total, recentlyUpdated] = await Promise.all([
      Yacht.find(filter)
        .sort(sortOrder)
        .select(listProjection)
        .skip(skip)
        .limit(parsedLimit)
        .lean()
        .exec(), // Use exec() for better performance
      Yacht.countDocuments(filter).exec(),
      // Recently updated (last 5) - still sorted by displayOrder first
      Yacht.find(filter)
        .sort(sortOrder)
        .select(listProjection)
        .limit(5)
        .lean()
        .exec(),
    ]);

    // Map image filenames to URLs and return yachts
    const yachtsWithUrls = mapImageFilenamesToUrls(yachts, req);

    const response = {
      yachts: yachtsWithUrls,
      page: Number(page),
      limit: parsedLimit,
      total,
      totalPages: Math.ceil(total / parsedLimit),
      recentlyUpdated,
    };

    // Lightweight log for observability on list responses
    console.log(
      `getAllYachts | page=${Number(page)} limit=${parsedLimit} status=${status || 'all'} | returned=${yachtsWithUrls.length} total=${total}`
    );

    return SuccessHandler(response, 200, 'Yachts fetched successfully', res);
  } catch (err) {
    next(new ApiError(err.message, 400));
  }
};

// Get yacht by ID
export const getYachtById = async (req, res, next) => {
  try {
    // Validate the query using Joi
    const { error } = getYachtByIdSchema.validate(req.query);
    if (error) {
      return next(new ApiError(error.details[0].message, 400));
    }

    const { id } = req.query;

    // Use lean() for better performance and select only needed fields
    const yacht = await Yacht.findById(id).lean().exec();

    if (!yacht) {
      return next(new ApiError('Yacht not found', 404));
    }

    // Map image filenames to URLs and return yacht
    const yachtWithUrls = mapImageFilenamesToUrls(yacht, req);
    return SuccessHandler(
      yachtWithUrls,
      200,
      'Yacht fetched successfully',
      res
    );
  } catch (err) {
    next(new ApiError(err.message, 400));
  }
};

// Get yacht by slug
export const getYachtBySlug = async (req, res, next) => {
  try {
    // Validate the query using Joi
    const { error } = getYachtBySlugSchema.validate(req.query);
    if (error) {
      return next(new ApiError(error.details[0].message, 400));
    }

    const { slug } = req.query;

    // Decode and normalize slug (similar to blog flow)
    let decodedSlug = slug;
    try {
      decodedSlug = decodeURIComponent(slug);
    } catch (e) {
      // fallback to original
    }
    const trimmedSlug = decodedSlug?.trim() || '';
    const isLatinBased = /^[a-zA-Z0-9\s\-_]+$/.test(trimmedSlug);
    const normalizedSlug = isLatinBased ? trimmedSlug.toLowerCase() : trimmedSlug;

    const searchConditions = [
      { slug: normalizedSlug },
      { slug: trimmedSlug },
      { 'translations.en.slug': normalizedSlug },
      { 'translations.en.slug': trimmedSlug },
      { 'translations.fr.slug': normalizedSlug },
      { 'translations.fr.slug': trimmedSlug },
      { 'translations.de.slug': normalizedSlug },
      { 'translations.de.slug': trimmedSlug },
      { 'translations.ru.slug': normalizedSlug },
      { 'translations.ru.slug': trimmedSlug },
      { 'translations.zh.slug': normalizedSlug },
      { 'translations.zh.slug': trimmedSlug },
      { 'translations.th.slug': normalizedSlug },
      { 'translations.th.slug': trimmedSlug },
      { 'translations.ar.slug': normalizedSlug },
      { 'translations.ar.slug': trimmedSlug },
    ];

    // Also try raw slug if different from decoded
    if (slug !== decodedSlug) {
      searchConditions.push(
        { slug },
        { 'translations.en.slug': slug },
        { 'translations.fr.slug': slug },
        { 'translations.de.slug': slug },
        { 'translations.ru.slug': slug },
        { 'translations.zh.slug': slug },
        { 'translations.th.slug': slug },
        { 'translations.ar.slug': slug },
      );
    }

    // Use lean() for better performance and select only needed fields
    const yacht = await Yacht.findOne({ $or: searchConditions }).lean().exec();

    if (!yacht) {
      return next(new ApiError('Yacht not found', 404));
    }

    // Map image filenames to URLs and return yacht
    const yachtWithUrls = mapImageFilenamesToUrls(yacht, req);
    return SuccessHandler(
      yachtWithUrls,
      200,
      'Yacht fetched successfully',
      res
    );
  } catch (err) {
    next(new ApiError(err.message, 400));
  }
};
export const deleteYacht = async (req, res, next) => {
  try {
    const { error } = getYachtByIdSchema.validate(req.query);
    if (error) {
      // You can use your ApiError class for consistency
      return next(new ApiError(error.details[0].message, 400));
    }

    const { id } = req.query;
    const yacht = await Yacht.findByIdAndDelete(id);
    if (!yacht) {
      return next(new ApiError('Yacht not found', 404));
    }
    // Invalidate caches after delete
    await clearYachtCache();
    return SuccessHandler(null, 200, 'Yacht deleted successfully', res);
  } catch (err) {
    next(new ApiError(err.message, 400));
  }
};

// Edit yacht by ID
export const editYacht = async (req, res, next) => {
  // Set a timeout for the entire request to prevent hanging
  // Note: Translations can take up to 5 minutes, plus file uploads and processing
  // Allow up to 20 minutes total (same as add) to handle translations + image uploads + database operations
  const requestTimeout = setTimeout(() => {
    if (!res.headersSent) {
      return next(new ApiError('Request timeout - yacht update is taking too long', 504));
    }
  }, 1200000); // 20 minutes max (same as add - 5 min translations + uploads/processing)
  
  // Set keep-alive headers to prevent connection timeout during long translations
  // This keeps the connection alive while translations process
  res.set('Connection', 'keep-alive');
  res.set('Keep-Alive', 'timeout=1200'); // 20 minutes

  try {
    const { id } = req.query;
    let yachtData = req.body;

    // Parse translations if sent as JSON string (multipart/form-data)
    if (yachtData?.translations && typeof yachtData.translations === 'string') {
      try {
        yachtData.translations = JSON.parse(yachtData.translations);
      } catch (err) {
        return next(new ApiError('Invalid translations format', 400));
      }
    }

    // Validate yacht ID
    const { error: idError } = getYachtByIdSchema.validate({ id });
    if (idError) {
      return next(new ApiError(idError.details[0].message, 400));
    }

    // Check if yacht exists
    const existingYacht = await Yacht.findById(id);
    if (!existingYacht) {
      return next(new ApiError('Yacht not found', 404));
    }

    // Handle primary image upload if provided (file upload or base64 string)
    if (req.files && req.files.primaryImage && req.files.primaryImage[0]) {
      try {
        const file = req.files.primaryImage[0];
        yachtData.primaryImage = await uploadToCloudinary(
          file.path,
          'Faraway/yachts/primaryImage'
        );
      } catch (uploadError) {
        return next(
          new ApiError(
            `Failed to upload primary image: ${uploadError.message}`,
            400
          )
        );
      }
    }

    // Handle gallery images upload if provided (file upload or base64 strings)
    const galleryImageFiles = [
      ...(req.files?.galleryImages || []),
      ...(req.files?.['galleryImages[]'] || []),
    ];

    if (galleryImageFiles.length > 0) {
      const newGalleryImages = [];
      // Upload images in parallel for better performance
      const uploadPromises = galleryImageFiles.map(async (file) => {
        try {
          return await uploadToCloudinary(
            file.path,
            'Faraway/yachts/galleryImages'
          );
        } catch (uploadError) {
          console.error(`Failed to upload gallery image ${file.originalname}:`, uploadError);
          throw uploadError;
        }
      });
      
      try {
        // Wait for all uploads with timeout (max 2 minutes per image, 10 minutes total)
        const uploadResults = await Promise.allSettled(uploadPromises);
        uploadResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            newGalleryImages.push(result.value);
          } else {
            console.error(`Gallery image ${galleryImageFiles[index].originalname} upload failed:`, result.reason);
            // Continue with other images even if one fails
          }
        });
      } catch (uploadError) {
        return next(
          new ApiError(
            `Failed to upload gallery images: ${uploadError.message}`,
            400
          )
        );
      }

      // If new gallery images are provided, replace the existing ones
      if (newGalleryImages.length > 0) {
        yachtData.galleryImages = newGalleryImages;
      }
    }

    // Derive slug if provided (from translations.en.slug or body.slug)
    let incomingSlug = null;
    if (yachtData.translations?.en?.slug || yachtData.slug) {
      try {
        incomingSlug = getSlugOrFail(yachtData);
        if (!yachtData.translations) yachtData.translations = {};
        if (!yachtData.translations.en) yachtData.translations.en = {};
        yachtData.translations.en.slug = incomingSlug;
        yachtData.slug = incomingSlug;
      } catch (slugError) {
        return next(slugError);
      }
    }

    // Validate yacht data (make all fields optional for editing)
    const { error: validationError } = editYachtSchema.validate(yachtData);
    if (validationError) {
      return next(new ApiError(validationError.details[0].message, 400));
    }

    // If slug is being changed, ensure uniqueness
    const currentSlug = existingYacht?.slug;
    if (incomingSlug && incomingSlug !== currentSlug) {
      const slugExists = await Yacht.findOne({
        slug: incomingSlug,
        _id: { $ne: id },
      })
        .lean()
        .exec();
      if (slugExists) {
        return next(new ApiError('Yacht with this slug already exists', 409));
      }
    }

    const currentTranslations = existingYacht.translations || {};
    let updateData = { ...yachtData };

    // Extract English content from translations.en or from top-level fields
    const incomingEnglish = yachtData.translations?.en || {};
    const currentEnglish = currentTranslations?.en || {};
    
    // Helper to get value prioritizing incoming, but preserving empty strings
    const getValue = (fieldName, incomingVal, topLevelVal, existingVal, defaultValue = '') => {
      // If field exists in incomingEnglish (even if empty string), use it
      if (incomingEnglish.hasOwnProperty(fieldName)) {
        return incomingVal !== undefined && incomingVal !== null ? incomingVal : defaultValue;
      }
      // Otherwise check top-level field
      if (yachtData.hasOwnProperty(fieldName) && yachtData[fieldName] !== undefined && yachtData[fieldName] !== null) {
        return yachtData[fieldName];
      }
      // Fallback to existing
      return existingVal !== undefined && existingVal !== null ? existingVal : defaultValue;
    };
    
    // Build English source from incoming data (prioritize translations.en, preserve empty strings)
    const englishSource = {
      slug: incomingEnglish.hasOwnProperty('slug') 
        ? (incomingEnglish.slug || '')
        : (incomingSlug || currentEnglish.slug || existingYacht.slug || ''),
      title: getValue('title', incomingEnglish.title, yachtData.title, currentEnglish.title),
      dayCharter: getValue('dayCharter', incomingEnglish.dayCharter, yachtData.dayCharter, currentEnglish.dayCharter),
      overnightCharter: getValue('overnightCharter', incomingEnglish.overnightCharter, yachtData.overnightCharter, currentEnglish.overnightCharter),
      aboutThisBoat: getValue('aboutThisBoat', incomingEnglish.aboutThisBoat, yachtData.aboutThisBoat, currentEnglish.aboutThisBoat),
      specifications: getValue('specifications', incomingEnglish.specifications, yachtData.specifications, currentEnglish.specifications),
      boatLayout: getValue('boatLayout', incomingEnglish.boatLayout, yachtData.boatLayout, currentEnglish.boatLayout),
      tags: incomingEnglish.hasOwnProperty('tags')
        ? (Array.isArray(incomingEnglish.tags) ? incomingEnglish.tags : [])
        : (Array.isArray(yachtData.tags) ? yachtData.tags : (Array.isArray(currentEnglish.tags) ? currentEnglish.tags : [])),
    };

    // Check if English content has changed by comparing with current translations
    // Normalize values for comparison (handle undefined/null/empty string consistently)
    const normalizeValue = (val) => val ?? '';
    const normalizeTags = (tags) => JSON.stringify(Array.isArray(tags) ? tags : []);
    
    const hasEnglishChanges = 
      normalizeValue(englishSource.slug) !== normalizeValue(currentEnglish.slug || existingYacht.slug) ||
      normalizeValue(englishSource.title) !== normalizeValue(currentEnglish.title) ||
      normalizeValue(englishSource.dayCharter) !== normalizeValue(currentEnglish.dayCharter) ||
      normalizeValue(englishSource.overnightCharter) !== normalizeValue(currentEnglish.overnightCharter) ||
      normalizeValue(englishSource.aboutThisBoat) !== normalizeValue(currentEnglish.aboutThisBoat) ||
      normalizeValue(englishSource.specifications) !== normalizeValue(currentEnglish.specifications) ||
      normalizeValue(englishSource.boatLayout) !== normalizeValue(currentEnglish.boatLayout) ||
      normalizeTags(englishSource.tags) !== normalizeTags(currentEnglish.tags);

    // If English content has changed, wait for ALL translations to complete successfully
    // DO NOT save if translations fail - wait for all languages to be translated
    if (hasEnglishChanges) {
      console.log('✅ English content changed, processing translations before saving...');
      
      // Send headers early with Transfer-Encoding: chunked to prevent gateway timeout
      // This allows us to send periodic keep-alive data while translations process
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Transfer-Encoding': 'chunked',
        'Connection': 'keep-alive',
        'Keep-Alive': 'timeout=600',
      });
      
      // Send periodic keep-alive chunks to prevent proxy/gateway timeout (504 errors)
      // Send a heartbeat every 20 seconds to keep the connection alive during translations
      const keepAliveInterval = setInterval(() => {
        try {
          // Send empty chunk as keep-alive signal (prevents 504 Gateway Timeout)
          res.write(''); // Empty chunk keeps connection alive
        } catch (err) {
          // Connection closed, clear interval
          clearInterval(keepAliveInterval);
        }
      }, 20000); // Every 20 seconds (well within most proxy timeout limits)
      
      try {
        // Process translations with timeout protection (max 5 minutes)
        const translationPromise = processTranslations(
          englishSource,
          YACHT_FIELD_CONFIG,
          currentTranslations
        );
        
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Translation timeout after 5 minutes')), 300000)
        );
        
        // Wait for ALL translations to complete successfully before proceeding
        const newTranslations = await Promise.race([translationPromise, timeoutPromise]);
        
        // Clear keep-alive interval once translations complete
        clearInterval(keepAliveInterval);
        
        // Verify all required languages are translated
        const requiredLanguages = ['en', 'fr', 'de', 'ru', 'zh', 'th', 'ar'];
        const missingLanguages = requiredLanguages.filter(lang => !newTranslations[lang]);
        
        if (missingLanguages.length > 0) {
          console.error('❌ Missing translations for languages:', missingLanguages);
          clearInterval(keepAliveInterval);
          const errorResponse = JSON.stringify({
            statusCode: 500,
            message: `Translation incomplete: missing translations for ${missingLanguages.join(', ')}`,
            success: false,
          });
          res.write(errorResponse);
          res.end();
          return;
        }
        
        updateData.translations = newTranslations;
        console.log('✅ All translations completed successfully for all languages');
      } catch (translationError) {
        console.error('❌ Translation error:', translationError.message);
        // Clear keep-alive interval on error
        clearInterval(keepAliveInterval);
        const errorResponse = JSON.stringify({
          statusCode: 500,
          message: `Translation failed: ${translationError.message}. Please try again.`,
          success: false,
        });
        res.write(errorResponse);
        res.end();
        return;
      }
    } else if (yachtData.translations || incomingEnglish && Object.keys(incomingEnglish).length > 0) {
      // If translations provided but English hasn't changed, still update English with new values
      // This ensures English is updated even if comparison didn't detect changes (e.g., same content but different format)
      updateData.translations = {
        ...currentTranslations, // Preserve all existing languages
        en: {
          ...currentTranslations.en,
          ...englishSource, // Update English with the complete source (includes all fields)
        },
      };
      console.log('✅ Translations preserved: English updated, other languages kept');
    } else {
      // No translations provided and no English changes, keep existing
      updateData.translations = currentTranslations;
    }

    // Ensure slug is set at top level for routing
    if (englishSource.slug) {
      updateData.slug = englishSource.slug;
    } else if (currentTranslations?.en?.slug) {
      updateData.slug = currentTranslations.en.slug;
    } else if (existingYacht.slug) {
      updateData.slug = existingYacht.slug;
    }

    // Update the yacht (this happens quickly, before translations complete)
    const updatedYacht = await Yacht.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    // Clear timeout since we're about to send response
    clearTimeout(requestTimeout);

    // Invalidate caches after edit
    await clearYachtCache();
    
    // Map image filenames to URLs and return updated yacht
    const yachtWithUrls = mapImageFilenamesToUrls(updatedYacht, req);
    
    // Send success response after everything is complete (including translations)
    // If headers were already sent (chunked transfer), write JSON and end
    if (res.headersSent) {
      const successResponse = JSON.stringify({
        statusCode: 200,
        message: 'Yacht updated successfully',
        success: true,
        data: yachtWithUrls,
      });
      res.write(successResponse);
      res.end();
      return;
    }
    
    // Otherwise use standard SuccessHandler
    return SuccessHandler(
      yachtWithUrls,
      200,
      'Yacht updated successfully',
      res
    );
  } catch (err) {
    // Clear timeout on error
    clearTimeout(requestTimeout);
    
    if (
      err &&
      err.code === 11000 &&
      (err.keyPattern?.slug || err.keyValue?.slug)
    ) {
      return next(new ApiError('Yacht with this slug already exists', 409));
    }
    next(new ApiError(err.message, 400));
  }
};

// Update yacht status (publish/unpublish)
export const updateYachtStatus = async (req, res, next) => {
  try {
    const { id } = req.query;
    const { status } = req.body;

    // Validate yacht ID
    const { error: idError } = getYachtByIdSchema.validate({ id });
    if (idError) {
      return next(new ApiError(idError.details[0].message, 400));
    }

    // Validate status
    if (!status || !['draft', 'published'].includes(status)) {
      return next(
        new ApiError('Status must be either "draft" or "published"', 400)
      );
    }

    // Check if yacht exists
    const existingYacht = await Yacht.findById(id);
    if (!existingYacht) {
      return next(new ApiError('Yacht not found', 404));
    }

    // Update the yacht status
    const updatedYacht = await Yacht.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    // Invalidate caches after status change
    await clearYachtCache();
    // Map image filenames to URLs and return updated yacht
    const yachtWithUrls = mapImageFilenamesToUrls(updatedYacht, req);
    return SuccessHandler(
      yachtWithUrls,
      200,
      `Yacht ${status === 'published' ? 'published' : 'unpublished'} successfully`,
      res
    );
  } catch (err) {
    next(new ApiError(err.message, 400));
  }
};

export default {
  addYacht,
  getAllYachts,
  getYachtById,
  getYachtBySlug,
  deleteYacht,
  editYacht,
  updateYachtStatus,
};
