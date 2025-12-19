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
      yachtData.galleryImages = [];
      for (const file of galleryImageFiles) {
        try {
          // Check file size (max 10MB)
          const maxSize = 10 * 1024 * 1024; // 10MB in bytes
          if (file.size > maxSize) {
            return next(
              new ApiError(
                `Gallery image file size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size of 10MB`,
                400
              )
            );
          }

          console.log(`📸 Uploading gallery image: ${file.originalname}`);

          // Check if file exists
          const fs = await import('fs/promises');
          try {
            await fs.access(file.path);
          } catch (accessError) {
            console.error('❌ Gallery image file access error');
            return next(new ApiError('Gallery image file not found', 500));
          }

          const url = await uploadToCloudinary(
            file.path,
            'yachts/galleryImages'
          );
          yachtData.galleryImages.push(url);
          console.log('✅ Gallery image uploaded successfully');
        } catch (uploadError) {
          console.error('❌ Gallery image upload failed');
          return next(new ApiError('Failed to upload gallery image', 400));
        }
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

    // Build English source for translation
    const en = yachtData.translations.en;
    const englishSource = {
      slug: en.slug,
      title: en.title,
      dayCharter: en.dayCharter,
      overnightCharter: en.overnightCharter,
      aboutThisBoat: en.aboutThisBoat,
      specifications: en.specifications,
      boatLayout: en.boatLayout,
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
    let translations;
    try {
      translations = await processTranslations(englishSource, YACHT_FIELD_CONFIG);
    } catch (translationError) {
      return next(
        new ApiError(
          'Failed to translate yacht content. Please try again later.',
          502
        )
      );
    }

    const yachtToCreate = {
      ...yachtData,
      slug: englishSource.slug,
      translations,
      // keep legacy top-level fields in sync with English so existing consumers continue to work
      title: englishSource.title,
      dayCharter: englishSource.dayCharter,
      overnightCharter: englishSource.overnightCharter,
      aboutThisBoat: englishSource.aboutThisBoat,
      specifications: englishSource.specifications,
      boatLayout: englishSource.boatLayout,
      tags: englishSource.tags || [],
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
    };

    // Use Promise.all for parallel execution
    const [yachts, total, recentlyUpdated] = await Promise.all([
      Yacht.find(filter)
        .sort({ updatedAt: -1, createdAt: -1 })
        .select(listProjection)
        .skip(skip)
        .limit(parsedLimit)
        .lean()
        .exec(), // Use exec() for better performance
      Yacht.countDocuments(filter).exec(),
      // Recently updated (last 5)
      Yacht.find(filter)
        .sort({ updatedAt: -1, createdAt: -1 })
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
      for (const file of galleryImageFiles) {
        try {
          const url = await uploadToCloudinary(
            file.path,
            'Faraway/yachts/galleryImages'
          );
          newGalleryImages.push(url);
        } catch (uploadError) {
          return next(
            new ApiError(
              `Failed to upload gallery image: ${uploadError.message}`,
              400
            )
          );
        }
      }

      // If new gallery images are provided, replace the existing ones
      yachtData.galleryImages = newGalleryImages;
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

    // If no translations provided but English fields were sent, auto-translate based on English
    const hasEnglishFields =
      yachtData.title ||
      yachtData.dayCharter ||
      yachtData.overnightCharter ||
      yachtData.aboutThisBoat ||
      yachtData.specifications ||
      yachtData.boatLayout ||
      (Array.isArray(yachtData.tags) && yachtData.tags.length > 0) ||
      incomingSlug;

    if (!yachtData.translations && hasEnglishFields) {
      const englishSource = {
        slug: incomingSlug || currentTranslations?.en?.slug || existingYacht.slug,
        title: yachtData.title || currentTranslations?.en?.title,
        dayCharter: yachtData.dayCharter || currentTranslations?.en?.dayCharter,
        overnightCharter: yachtData.overnightCharter || currentTranslations?.en?.overnightCharter,
        aboutThisBoat: yachtData.aboutThisBoat || currentTranslations?.en?.aboutThisBoat,
        specifications: yachtData.specifications || currentTranslations?.en?.specifications,
        boatLayout: yachtData.boatLayout || currentTranslations?.en?.boatLayout,
        tags: yachtData.tags || currentTranslations?.en?.tags || [],
      };

      try {
        updateData.translations = await processTranslations(
          englishSource,
          YACHT_FIELD_CONFIG,
          currentTranslations
        );
      } catch (translationError) {
        return next(
          new ApiError(
            'Failed to translate yacht content while updating. Please try again later.',
            502
          )
        );
      }

      // keep legacy top-level fields in sync with English
      updateData.slug = englishSource.slug;
      updateData.title = englishSource.title;
      updateData.dayCharter = englishSource.dayCharter;
      updateData.overnightCharter = englishSource.overnightCharter;
      updateData.aboutThisBoat = englishSource.aboutThisBoat;
      updateData.specifications = englishSource.specifications;
      updateData.boatLayout = englishSource.boatLayout;
      updateData.tags = englishSource.tags;
    }

    // Ensure slug remains set from existing translations if none provided
    if (!incomingSlug && currentTranslations?.en?.slug && !updateData.slug) {
      updateData.slug = currentTranslations.en.slug;
    }

    // Keep legacy top-level fields in sync when translations are provided directly
    if (updateData.translations?.en) {
      const en = updateData.translations.en;
      if (en.slug) updateData.slug = en.slug;
      if (en.title && !updateData.title) updateData.title = en.title;
      if (en.dayCharter && !updateData.dayCharter) updateData.dayCharter = en.dayCharter;
      if (en.overnightCharter && !updateData.overnightCharter) updateData.overnightCharter = en.overnightCharter;
      if (en.aboutThisBoat && !updateData.aboutThisBoat) updateData.aboutThisBoat = en.aboutThisBoat;
      if (en.specifications && !updateData.specifications) updateData.specifications = en.specifications;
      if (en.boatLayout && !updateData.boatLayout) updateData.boatLayout = en.boatLayout;
      if (en.tags && !updateData.tags) updateData.tags = en.tags;
    }

    // Update the yacht
    const updatedYacht = await Yacht.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    // Invalidate caches after edit
    await clearYachtCache();
    // Map image filenames to URLs and return updated yacht
    const yachtWithUrls = mapImageFilenamesToUrls(updatedYacht, req);
    return SuccessHandler(
      yachtWithUrls,
      200,
      'Yacht updated successfully',
      res
    );
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
