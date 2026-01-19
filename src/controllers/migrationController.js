import Blog from '../models/blog.js';
import Yacht from '../models/yacht.js';
import ApiError from '../utils/ApiError.js';
import SuccessHandler from '../utils/SuccessHandler.js';
import { processTranslations } from '../utils/translationHelper.js';
import { BLOG_FIELD_CONFIG, YACHT_FIELD_CONFIG } from '../utils/translationService.js';
import { clearBlogCache, clearYachtCache } from '../utils/cache.js';
import logger from '../functions/logger.js';

/**
 * Migrate old blog format to new translation structure
 * Old format: { slug, title, shortDescription, detailDescription }
 * New format: { translations: { en: { slug, title, ... }, fr: {...}, ... } }
 */
export const migrateBlogs = async (req, res, next) => {
  try {
    logger.info('🔄 Starting blog migration...');

    // Find all blogs that need migration:
    // 1. Don't have translations structure
    // 2. Have translations but missing en
    // 3. Have legacy top-level fields (slug, title, etc.) that should be removed
    // LIMIT: Process only 2 blogs at a time for testing/safety
    const MIGRATION_LIMIT = 2;
    
    const blogsToMigrate = await Blog.find({
      $or: [
        { translations: { $exists: false } },
        { 'translations.en': { $exists: false } },
        // Also check for blogs with top-level fields (legacy format)
        { 
          $and: [
            { slug: { $exists: true } },
            { 'translations.en.slug': { $exists: false } }
          ]
        },
        // Blogs that have translations but still have legacy fields (cleanup)
        {
          $and: [
            { 'translations.en': { $exists: true } },
            {
              $or: [
                { slug: { $exists: true } },
                { title: { $exists: true } },
                { shortDescription: { $exists: true } },
                { detailDescription: { $exists: true } }
              ]
            }
          ]
        }
      ]
    })
    .limit(MIGRATION_LIMIT) // Process only first 2 blogs
    .lean()
    .exec();

    // Get total count for reporting
    const totalBlogsNeedingMigration = await Blog.countDocuments({
      $or: [
        { translations: { $exists: false } },
        { 'translations.en': { $exists: false } },
        { 
          $and: [
            { slug: { $exists: true } },
            { 'translations.en.slug': { $exists: false } }
          ]
        },
        {
          $and: [
            { 'translations.en': { $exists: true } },
            {
              $or: [
                { slug: { $exists: true } },
                { title: { $exists: true } },
                { shortDescription: { $exists: true } },
                { detailDescription: { $exists: true } }
              ]
            }
          ]
        }
      ]
    });

    if (blogsToMigrate.length === 0) {
      return SuccessHandler(
        { migrated: 0, message: 'No blogs need migration' },
        200,
        'Migration completed',
        res
      );
    }

    logger.info(`📝 Found ${totalBlogsNeedingMigration} total blog(s) needing migration`);
    logger.info(`🔄 Processing first ${blogsToMigrate.length} blog(s) (limit: ${MIGRATION_LIMIT})`);

    const results = {
      total: totalBlogsNeedingMigration, // Total blogs needing migration
      processed: blogsToMigrate.length, // Blogs processed in this run
      successful: 0,
      failed: 0,
      errors: [],
      limit: MIGRATION_LIMIT,
      message: `Processed ${blogsToMigrate.length} of ${totalBlogsNeedingMigration} blogs (limit: ${MIGRATION_LIMIT})`,
    };

    // Process each blog
    for (const blog of blogsToMigrate) {
      try {
        // Check if blog has legacy top-level fields
        const hasLegacyFields = blog.slug || blog.title || blog.shortDescription || blog.detailDescription;
        
        // Check if blog already has translations.en
        const hasEnglishTranslation = blog.translations?.en;

        let englishSource;
        let needsTranslation = false;

        if (hasLegacyFields && !hasEnglishTranslation) {
          // Migrate from legacy format - needs translation
          englishSource = {
            slug: blog.slug || '',
            title: blog.title || '',
            shortDescription: blog.shortDescription || '',
            detailDescription: blog.detailDescription || '',
          };
          needsTranslation = true;
          logger.info(`🔄 Migrating blog: ${blog._id} - "${englishSource.title}"`);
        } else if (hasEnglishTranslation && hasLegacyFields) {
          // Blog already has translations.en but still has legacy fields - just cleanup
          // Don't re-translate, just remove legacy fields
          logger.info(`🧹 Cleaning up legacy fields for blog: ${blog._id} - "${blog.translations.en.title || 'Untitled'}"`);
          
          const updateData = {
            $unset: {
              slug: '',
              title: '',
              shortDescription: '',
              detailDescription: '',
            },
          };

          await Blog.findByIdAndUpdate(blog._id, updateData, { new: true });
          results.successful++;
          continue; // Skip translation step
        } else if (hasEnglishTranslation) {
          // Blog already has translations.en, just ensure other languages are translated
          englishSource = {
            slug: blog.translations.en.slug || blog.slug || '',
            title: blog.translations.en.title || '',
            shortDescription: blog.translations.en.shortDescription || '',
            detailDescription: blog.translations.en.detailDescription || '',
          };
          needsTranslation = true;
          logger.info(`🔄 Updating translations for blog: ${blog._id} - "${englishSource.title}"`);
        } else {
          // Skip if no data to migrate
          logger.warn(`⚠️ Skipping blog ${blog._id}: No data to migrate`);
          results.failed++;
          results.errors.push({
            id: blog._id,
            error: 'No data to migrate',
          });
          continue;
        }

        // Only process translations if needed
        if (needsTranslation) {
          // Validate required fields
          if (!englishSource.slug || !englishSource.title) {
            logger.warn(`⚠️ Skipping blog ${blog._id}: Missing required fields (slug or title)`);
            results.failed++;
            results.errors.push({
              id: blog._id,
              error: 'Missing required fields (slug or title)',
            });
            continue;
          }

          // Process translations (auto-translate to all languages)
          // Wrap in try-catch to ensure we save data even if translation fails
          let translations;
          try {
            translations = await processTranslations(englishSource, BLOG_FIELD_CONFIG, blog.translations);
            logger.info(`✅ Translations processed successfully for blog: ${blog._id}`);
            
            // Ensure English is always present (required field)
            if (!translations || !translations.en) {
              throw new Error('Translations missing English data');
            }
          } catch (translationError) {
            logger.error(`⚠️ Translation failed for blog ${blog._id}, using English fallback:`, translationError.message);
            
            // Create translations object with English data only (safe fallback)
            // This ensures the blog is saved even if translation completely fails
            const englishFallback = {
              slug: englishSource.slug,
              title: englishSource.title,
              shortDescription: englishSource.shortDescription || '',
              detailDescription: englishSource.detailDescription || '',
            };
            
            translations = {
              en: englishFallback, // Required - always use English source
              // Preserve existing translations if available, otherwise use English as fallback
              fr: blog.translations?.fr || englishFallback,
              de: blog.translations?.de || englishFallback,
              ru: blog.translations?.ru || englishFallback,
              zh: blog.translations?.zh || englishFallback,
              th: blog.translations?.th || englishFallback,
              ar: blog.translations?.ar || englishFallback,
            };
            
            logger.warn(`⚠️ Using English-only translations for blog ${blog._id} due to translation failure`);
            logger.info(`📝 Blog will be saved with English data only (safe fallback)`);
          }

          // CREATE NEW blog with clean structure (no legacy fields)
          // Build clean object - only include: image, status, translations
          const cleanBlogData = {
            image: blog.image,
            status: blog.status || 'draft',
            translations: translations,
            // Explicitly DO NOT include legacy fields
          };

          // Validate translations before creating blog
          if (!translations || !translations.en) {
            throw new Error('Invalid translations: English data is required');
          }
          
          if (!translations.en.slug || !translations.en.title) {
            throw new Error('Invalid translations: English slug and title are required');
          }
          
          logger.info(`📝 Creating NEW blog for: ${blog._id} - "${englishSource.title}"`);
          
          // STEP 1: CREATE new blog FIRST (fresh document, new _id)
          // Wrap in try-catch to ensure we handle any creation errors
          let newBlog;
          try {
            newBlog = await Blog.create(cleanBlogData);
            logger.info(`✅ NEW blog created with ID: ${newBlog._id}`);
          } catch (createError) {
            logger.error(`❌ Failed to create new blog for ${blog._id}:`, createError.message);
            throw new Error(`Blog creation failed: ${createError.message}`);
          }

          // STEP 2: DELETE old blog AFTER new one is created
          logger.info(`🗑️ Deleting old blog: ${blog._id}`);
          
          // Use findByIdAndDelete for more reliable deletion
          const deletedBlog = await Blog.findByIdAndDelete(blog._id);
          
          if (!deletedBlog) {
            // Try alternative method if findByIdAndDelete fails
            logger.warn(`⚠️ findByIdAndDelete returned null, trying deleteOne...`);
            const deleteResult = await Blog.deleteOne({ _id: blog._id });
            
            if (deleteResult.deletedCount === 0) {
              logger.error(`❌ FAILED to delete old blog ${blog._id}`);
              logger.error(`   - deleteResult.deletedCount: ${deleteResult.deletedCount}`);
              
              // Verify if blog still exists
              const verifyDelete = await Blog.findById(blog._id).lean().exec();
              if (verifyDelete) {
                logger.error(`   - ❌ Old blog STILL EXISTS in database!`);
                logger.error(`   - Has legacy fields: ${!!(verifyDelete.slug || verifyDelete.title)}`);
                // Add to errors but don't fail completely
                results.errors.push({
                  id: blog._id.toString(),
                  error: 'Old blog could not be deleted',
                  newBlogId: newBlog._id.toString(),
                });
              }
            } else {
              logger.info(`✅ Old blog deleted using deleteOne: ${blog._id} (${deleteResult.deletedCount} document(s) removed)`);
            }
          } else {
            logger.info(`✅ Old blog deleted successfully: ${blog._id}`);
            logger.info(`   - Deleted blog title: ${deletedBlog.translations?.en?.title || deletedBlog.title || 'Unknown'}`);
          }

          results.successful++;
          logger.info(`✅ Migrated blog: ${blog._id} -> ${newBlog._id} - "${englishSource.title}"`);
        } else {
          // No translation needed, but still need to create new and delete old if has legacy fields
          if (hasLegacyFields) {
            // Build clean object
            const cleanBlogData = {
              image: blog.image,
              status: blog.status || 'draft',
              translations: blog.translations || {},
            };

            logger.info(`📝 Creating NEW blog (cleanup only) for: ${blog._id}`);
            
            // CREATE new blog
            const newBlog = await Blog.create(cleanBlogData);
            logger.info(`✅ NEW blog created with ID: ${newBlog._id}`);

            // DELETE old blog
            logger.info(`🗑️ Deleting old blog: ${blog._id}`);
            
            // Use findByIdAndDelete for more reliable deletion
            const deletedBlog = await Blog.findByIdAndDelete(blog._id);
            
            if (!deletedBlog) {
              // Try alternative method
              const deleteResult = await Blog.deleteOne({ _id: blog._id });
              if (deleteResult.deletedCount > 0) {
                logger.info(`✅ Old blog deleted using deleteOne: ${blog._id}`);
              } else {
                logger.error(`❌ FAILED to delete old blog ${blog._id}`);
                const verifyDelete = await Blog.findById(blog._id).lean().exec();
                if (verifyDelete) {
                  logger.error(`   - ❌ Old blog STILL EXISTS in database!`);
                }
              }
            } else {
              logger.info(`✅ Old blog deleted successfully: ${blog._id}`);
            }

            results.successful++;
            logger.info(`✅ Cleaned up blog: ${blog._id} -> ${newBlog._id}`);
          } else {
            // No legacy fields, no migration needed
            results.successful++;
            logger.info(`⏭️ Skipping blog ${blog._id}: Already clean`);
          }
        }
      } catch (error) {
        logger.error(`❌ Failed to migrate blog ${blog._id}:`, error.message);
        results.failed++;
        results.errors.push({
          id: blog._id,
          error: error.message || 'Unknown error',
        });
      }
    }

    // Clear cache aggressively after migration (force mode)
    logger.info('🗑️ Clearing blog cache after migration (force mode)...');
    try {
      await clearBlogCache(true); // Force clear
      logger.info('✅ Blog cache cleared successfully');
    } catch (cacheError) {
      logger.error('⚠️ Cache clear had issues (non-fatal):', cacheError.message);
      // Try one more time without force
      try {
        await clearBlogCache(false);
        logger.info('✅ Blog cache cleared on retry');
      } catch (retryError) {
        logger.error('❌ Cache clear failed on retry:', retryError.message);
      }
    }

    logger.info(`✅ Blog migration completed: ${results.successful} successful, ${results.failed} failed`);
    logger.info(`📊 Processed ${results.processed} of ${results.total} blogs (limit: ${MIGRATION_LIMIT})`);

    return SuccessHandler(
      results,
      200,
      `Migration completed: ${results.successful} successful, ${results.failed} failed. Processed ${results.processed} of ${results.total} blogs.`,
      res
    );
  } catch (err) {
    logger.error('❌ Blog migration error:', err);
    next(new ApiError(err.message || 'Migration failed', 500));
  }
};

/**
 * Migrate old yacht format to new translation structure
 * Old format: { slug, title, dayCharter, overnightCharter, aboutThisBoat, specifications, boatLayout, tags }
 * New format: { translations: { en: { slug, title, ... }, fr: {...}, ... } }
 */
export const migrateYachts = async (req, res, next) => {
  try {
    logger.info('🔄 Starting yacht migration...');

    // ============================================================================
    // STEP 1: Define migration query conditions
    // ============================================================================
    // A yacht needs migration if ANY of these conditions are true:
    // 1. Missing translations object entirely
    // 2. Missing translations.en object
    // 3. translations.en exists but missing required fields (slug or title)
    // 4. Has legacy top-level fields that need to be moved to translations.en
    // 5. Has translations.en but still has legacy top-level fields (needs cleanup)
    
    const MIGRATION_LIMIT = 5; // Process only 2 yachts at a time for safety
    
    // Build the migration query conditions
    const migrationQuery = {
      $or: [
        // Condition 1: No translations object at all
        { translations: { $exists: false } },
        
        // Condition 2: translations exists but translations.en doesn't exist
        { 'translations.en': { $exists: false } },
        
        // Condition 3: translations.en exists but missing required fields (slug OR title)
        {
          $or: [
            { 'translations.en.slug': { $exists: false } },
            { 'translations.en.slug': null },
            { 'translations.en.slug': '' },
            { 'translations.en.title': { $exists: false } },
            { 'translations.en.title': null },
            { 'translations.en.title': '' }
          ]
        },
        
        // Condition 4: Has top-level slug but no translations.en.slug (legacy format)
        { 
          $and: [
            { slug: { $exists: true, $ne: null, $ne: '' } },
            {
              $or: [
                { 'translations.en.slug': { $exists: false } },
                { 'translations.en.slug': null },
                { 'translations.en.slug': '' }
              ]
            }
          ]
        },
        
        // Condition 5: Has top-level title but no translations.en.title (legacy format)
        { 
          $and: [
            { title: { $exists: true, $ne: null, $ne: '' } },
            {
              $or: [
                { 'translations.en.title': { $exists: false } },
                { 'translations.en.title': null },
                { 'translations.en.title': '' }
              ]
            }
          ]
        },
        
        // Condition 6: Has translations.en with required fields, but still has legacy top-level fields
        // AND legacy fields are DIFFERENT from translations.en (need cleanup)
        // Skip if legacy fields match translations.en (already clean)
        {
          $and: [
            { 'translations.en': { $exists: true } },
            { 'translations.en.slug': { $exists: true, $ne: null, $ne: '' } },
            { 'translations.en.title': { $exists: true, $ne: null, $ne: '' } },
            {
              $or: [
                // Legacy slug exists AND is different from translations.en.slug
                {
                  $and: [
                    { slug: { $exists: true, $ne: null, $ne: '' } },
                    { $expr: { $ne: ['$slug', '$translations.en.slug'] } }
                  ]
                },
                // Legacy title exists AND is different from translations.en.title
                {
                  $and: [
                    { title: { $exists: true, $ne: null, $ne: '' } },
                    { $expr: { $ne: ['$title', '$translations.en.title'] } }
                  ]
                },
                // Legacy dayCharter exists AND (translations.en.dayCharter doesn't exist OR is different)
                {
                  $and: [
                    { dayCharter: { $exists: true, $ne: null, $ne: '' } },
                    {
                      $or: [
                        { 'translations.en.dayCharter': { $exists: false } },
                        { 'translations.en.dayCharter': null },
                        { 'translations.en.dayCharter': '' },
                        { $expr: { $ne: ['$dayCharter', '$translations.en.dayCharter'] } }
                      ]
                    }
                  ]
                },
                // Legacy overnightCharter exists AND (translations.en.overnightCharter doesn't exist OR is different)
                {
                  $and: [
                    { overnightCharter: { $exists: true, $ne: null, $ne: '' } },
                    {
                      $or: [
                        { 'translations.en.overnightCharter': { $exists: false } },
                        { 'translations.en.overnightCharter': null },
                        { 'translations.en.overnightCharter': '' },
                        { $expr: { $ne: ['$overnightCharter', '$translations.en.overnightCharter'] } }
                      ]
                    }
                  ]
                },
                // Legacy aboutThisBoat exists AND (translations.en.aboutThisBoat doesn't exist OR is different)
                {
                  $and: [
                    { aboutThisBoat: { $exists: true, $ne: null, $ne: '' } },
                    {
                      $or: [
                        { 'translations.en.aboutThisBoat': { $exists: false } },
                        { 'translations.en.aboutThisBoat': null },
                        { 'translations.en.aboutThisBoat': '' },
                        { $expr: { $ne: ['$aboutThisBoat', '$translations.en.aboutThisBoat'] } }
                      ]
                    }
                  ]
                },
                // Legacy specifications exists AND (translations.en.specifications doesn't exist OR is different)
                {
                  $and: [
                    { specifications: { $exists: true, $ne: null, $ne: '' } },
                    {
                      $or: [
                        { 'translations.en.specifications': { $exists: false } },
                        { 'translations.en.specifications': null },
                        { 'translations.en.specifications': '' },
                        { $expr: { $ne: ['$specifications', '$translations.en.specifications'] } }
                      ]
                    }
                  ]
                },
                // Legacy boatLayout exists AND (translations.en.boatLayout doesn't exist OR is different)
                {
                  $and: [
                    { boatLayout: { $exists: true, $ne: null, $ne: '' } },
                    {
                      $or: [
                        { 'translations.en.boatLayout': { $exists: false } },
                        { 'translations.en.boatLayout': null },
                        { 'translations.en.boatLayout': '' },
                        { $expr: { $ne: ['$boatLayout', '$translations.en.boatLayout'] } }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };

    // ============================================================================
    // STEP 2: Find yachts that need migration
    // ============================================================================
    const yachtsToMigrate = await Yacht.find(migrationQuery)
      .limit(MIGRATION_LIMIT)
      .lean()
      .exec();

    // Get total count for reporting (using same query)
    const totalYachtsNeedingMigration = await Yacht.countDocuments(migrationQuery);
    
    // Log detailed information about found yachts
    logger.info(`📋 Detailed analysis of yachts needing migration:`);
    for (const yacht of yachtsToMigrate) {
      const reasons = [];
      
      // Check which condition matches
      if (!yacht.translations) {
        reasons.push('Missing translations object');
      } else if (!yacht.translations.en) {
        reasons.push('Missing translations.en object');
      } else {
        const en = yacht.translations.en;
        if (!en.slug || en.slug.trim() === '' || !en.title || en.title.trim() === '') {
          reasons.push('Missing required fields in translations.en (slug or title)');
        }
      }
      
      // Check for legacy fields
      const legacyFields = [];
      if (yacht.slug && yacht.slug.trim() !== '') legacyFields.push('slug');
      if (yacht.title && yacht.title.trim() !== '') legacyFields.push('title');
      if (yacht.dayCharter && yacht.dayCharter.trim() !== '') legacyFields.push('dayCharter');
      if (yacht.overnightCharter && yacht.overnightCharter.trim() !== '') legacyFields.push('overnightCharter');
      if (yacht.aboutThisBoat && yacht.aboutThisBoat.trim() !== '') legacyFields.push('aboutThisBoat');
      if (yacht.specifications && yacht.specifications.trim() !== '') legacyFields.push('specifications');
      if (yacht.boatLayout && yacht.boatLayout.trim() !== '') legacyFields.push('boatLayout');
      if (yacht.tags && Array.isArray(yacht.tags) && yacht.tags.length > 0) legacyFields.push('tags');
      
      if (legacyFields.length > 0) {
        reasons.push(`Has legacy top-level fields: ${legacyFields.join(', ')}`);
      }
      
      logger.info(`   🎯 Yacht ${yacht._id}:`);
      logger.info(`      - Title: "${yacht.title || yacht.translations?.en?.title || 'N/A'}"`);
      logger.info(`      - Slug: "${yacht.slug || yacht.translations?.en?.slug || 'N/A'}"`);
      logger.info(`      - Reasons: ${reasons.join('; ')}`);
      logger.info(`      - Has translations.en: ${!!yacht.translations?.en}`);
      logger.info(`      - Has legacy fields: ${legacyFields.length > 0}`);
    }

    if (yachtsToMigrate.length === 0) {
      return SuccessHandler(
        { migrated: 0, message: 'No yachts need migration' },
        200,
        'Migration completed',
        res
      );
    }

    logger.info(`📝 Found ${totalYachtsNeedingMigration} total yacht(s) needing migration`);
    logger.info(`🔄 Processing first ${yachtsToMigrate.length} yacht(s) (limit: ${MIGRATION_LIMIT})`);

    const results = {
      total: totalYachtsNeedingMigration, // Total yachts needing migration
      processed: yachtsToMigrate.length, // Yachts processed in this run
      successful: 0,
      failed: 0,
      skipped: 0, // Yachts skipped because legacy fields match translations.en
      errors: [],
      limit: MIGRATION_LIMIT,
      message: `Processed ${yachtsToMigrate.length} of ${totalYachtsNeedingMigration} yachts (limit: ${MIGRATION_LIMIT})`,
    };

    // ============================================================================
    // STEP 3: Process each yacht step by step
    // ============================================================================
    for (const yacht of yachtsToMigrate) {
      try {
        // ------------------------------------------------------------------------
        // STEP 3.1: Analyze yacht state
        // ------------------------------------------------------------------------
        // Check if yacht has legacy top-level translatable fields (non-empty only)
        // Legacy fields: slug, title, dayCharter, overnightCharter, aboutThisBoat, specifications, boatLayout, tags
        const hasLegacyFields = (yacht.slug && yacht.slug.trim() !== '') || 
                                (yacht.title && yacht.title.trim() !== '') || 
                                (yacht.dayCharter && yacht.dayCharter.trim() !== '') || 
                                (yacht.overnightCharter && yacht.overnightCharter.trim() !== '') || 
                                (yacht.aboutThisBoat && yacht.aboutThisBoat.trim() !== '') || 
                                (yacht.specifications && yacht.specifications.trim() !== '') || 
                                (yacht.boatLayout && yacht.boatLayout.trim() !== '') || 
                                (yacht.tags && Array.isArray(yacht.tags) && yacht.tags.length > 0);
        
        // Check if yacht has valid translations.en with REQUIRED fields (slug and title)
        // Note: Other fields (dayCharter, overnightCharter, etc.) are optional
        const hasTranslationsEn = !!(yacht.translations && yacht.translations.en);
        const hasRequiredSlug = !!(yacht.translations?.en?.slug && yacht.translations.en.slug.trim() !== '');
        const hasRequiredTitle = !!(yacht.translations?.en?.title && yacht.translations.en.title.trim() !== '');
        const hasEnglishTranslation = hasTranslationsEn && hasRequiredSlug && hasRequiredTitle;
        
        // Log yacht state for debugging
        logger.info(`🔍 Yacht ${yacht._id} - hasLegacyFields: ${hasLegacyFields}, hasEnglishTranslation: ${hasEnglishTranslation}`);
        logger.info(`   - hasTranslationsEn: ${hasTranslationsEn}, hasRequiredSlug: ${hasRequiredSlug}, hasRequiredTitle: ${hasRequiredTitle}`);
        if (hasLegacyFields) {
          logger.info(`   - Legacy fields found: slug=${!!yacht.slug}, title=${!!yacht.title}, dayCharter=${!!yacht.dayCharter}`);
        }
        if (yacht.translations?.en) {
          logger.info(`   - translations.en exists: slug="${yacht.translations.en.slug || 'missing'}", title="${yacht.translations.en.title || 'missing'}"`);
        } else {
          logger.info(`   - translations.en does NOT exist`);
        }

        // ------------------------------------------------------------------------
        // STEP 3.2: Determine migration scenario and English source data
        // ------------------------------------------------------------------------
        let englishSource;
        let migrationScenario = '';

        if (!hasEnglishTranslation && hasLegacyFields) {
          // ========================================================================
          // SCENARIO 1: OLD YACHT - No translations.en, has legacy fields
          // ========================================================================
          // Example: Yacht 68a75de04886386b890c70fb (Cranchi 58ft)
          // - Has: title, slug, dayCharter, overnightCharter, aboutThisBoat at top level
          // - Missing: translations object entirely
          // Action: Migrate all legacy fields to translations.en, then translate to other languages
          // ========================================================================
          migrationScenario = 'LEGACY_MIGRATION';
          englishSource = {
            slug: yacht.slug || '',
            title: yacht.title || '',
            dayCharter: yacht.dayCharter || '',
            overnightCharter: yacht.overnightCharter || '',
            aboutThisBoat: yacht.aboutThisBoat || '',
            specifications: yacht.specifications || '',
            boatLayout: yacht.boatLayout || '',
            tags: yacht.tags || [],
          };
          logger.info(`📦 SCENARIO 1 - Legacy Migration: ${yacht._id}`);
          logger.info(`   - Title: "${englishSource.title}"`);
          logger.info(`   - Slug: "${englishSource.slug}"`);
          logger.info(`   - Will create translations.en and translate to all languages`);
          
        } else if (hasEnglishTranslation && hasLegacyFields) {
          // ========================================================================
          // SCENARIO 2: NEW YACHT - Has translations.en but also has legacy fields
          // ========================================================================
          // Example: Yacht 6959279f65fb4c340e0c62ff (testing)
          // - Has: translations.en with slug, title, tags
          // - Also has: top-level title, slug (duplicate data)
          // Action: Use translations.en as source, fill missing optional fields from top-level, then cleanup legacy fields
          // ========================================================================
          migrationScenario = 'CLEANUP';
          
          // Check if legacy fields match translations.en (if they match, we can skip)
          const en = yacht.translations.en;
          const legacySlugMatches = yacht.slug && yacht.slug.trim() === (en.slug || '').trim();
          const legacyTitleMatches = yacht.title && yacht.title.trim() === (en.title || '').trim();
          const legacyDayCharterMatches = (!yacht.dayCharter || yacht.dayCharter.trim() === '') || (yacht.dayCharter.trim() === (en.dayCharter || '').trim());
          const legacyOvernightCharterMatches = (!yacht.overnightCharter || yacht.overnightCharter.trim() === '') || (yacht.overnightCharter.trim() === (en.overnightCharter || '').trim());
          const legacyAboutThisBoatMatches = (!yacht.aboutThisBoat || yacht.aboutThisBoat.trim() === '') || (yacht.aboutThisBoat.trim() === (en.aboutThisBoat || '').trim());
          const legacySpecificationsMatches = (!yacht.specifications || yacht.specifications.trim() === '') || (yacht.specifications.trim() === (en.specifications || '').trim());
          const legacyBoatLayoutMatches = (!yacht.boatLayout || yacht.boatLayout.trim() === '') || (yacht.boatLayout.trim() === (en.boatLayout || '').trim());
          const legacyTagsMatch = (!yacht.tags || yacht.tags.length === 0) || (JSON.stringify(yacht.tags || []) === JSON.stringify(en.tags || []));
          
          // If all legacy fields match translations.en (or are empty), skip migration
          if (legacySlugMatches && legacyTitleMatches && legacyDayCharterMatches && 
              legacyOvernightCharterMatches && legacyAboutThisBoatMatches && 
              legacySpecificationsMatches && legacyBoatLayoutMatches && legacyTagsMatch) {
            logger.info(`⏭️ Skipping yacht ${yacht._id}: Legacy fields match translations.en (already clean)`);
            results.skipped = (results.skipped || 0) + 1;
            continue;
          }
          
          // Use translations.en as primary source, fill missing optional fields from top-level
          englishSource = {
            slug: en.slug || yacht.slug || '', // translations.en.slug is source of truth
            title: en.title || yacht.title || '', // translations.en.title is source of truth
            // Optional fields: use translations.en if exists, otherwise use top-level, otherwise empty
            dayCharter: en.dayCharter !== undefined && en.dayCharter !== null && en.dayCharter.trim() !== '' ? en.dayCharter : (yacht.dayCharter || ''),
            overnightCharter: en.overnightCharter !== undefined && en.overnightCharter !== null && en.overnightCharter.trim() !== '' ? en.overnightCharter : (yacht.overnightCharter || ''),
            aboutThisBoat: en.aboutThisBoat !== undefined && en.aboutThisBoat !== null && en.aboutThisBoat.trim() !== '' ? en.aboutThisBoat : (yacht.aboutThisBoat || ''),
            specifications: en.specifications !== undefined && en.specifications !== null && en.specifications.trim() !== '' ? en.specifications : (yacht.specifications || ''),
            boatLayout: en.boatLayout !== undefined && en.boatLayout !== null && en.boatLayout.trim() !== '' ? en.boatLayout : (yacht.boatLayout || ''),
            tags: (en.tags && Array.isArray(en.tags) && en.tags.length > 0) ? en.tags : (yacht.tags || []),
          };
          logger.info(`🧹 SCENARIO 2 - Cleanup: ${yacht._id}`);
          logger.info(`   - Title: "${englishSource.title}"`);
          logger.info(`   - Slug: "${englishSource.slug}"`);
          logger.info(`   - Will remove legacy top-level fields after migration`);
          
        } else {
          // ========================================================================
          // SCENARIO 3: No data to migrate (skip)
          // ========================================================================
          logger.warn(`⚠️ Skipping yacht ${yacht._id}: No data to migrate`);
          logger.warn(`   - hasLegacyFields: ${hasLegacyFields}`);
          logger.warn(`   - hasEnglishTranslation: ${hasEnglishTranslation}`);
          results.failed++;
          results.errors.push({ id: yacht._id, error: 'No data to migrate' });
          continue;
        }

        // ------------------------------------------------------------------------
        // STEP 3.3: Validate required fields
        // ------------------------------------------------------------------------
        if (!englishSource.slug || !englishSource.title) {
          logger.warn(`⚠️ Skipping yacht ${yacht._id}: Missing required fields (slug or title)`);
          results.failed++;
          results.errors.push({ id: yacht._id, error: 'Missing required fields (slug or title)' });
          continue;
        }

        // ------------------------------------------------------------------------
        // STEP 3.4: Process translations (auto-translate to all languages)
        // ------------------------------------------------------------------------
        // Strategy: Always ensure English data exists, translate other languages if needed
        // If translation fails, use English fallback (don't stop migration)
        let translations;
        
        if (hasEnglishTranslation) {
          // Scenario A: Yacht already has translations.en - preserve and update
          logger.info(`📋 Preserving existing translations.en for yacht: ${yacht._id}`);
          translations = {
            ...yacht.translations, // Preserve all existing translations
            en: {
              ...yacht.translations.en, // Keep existing translations.en
              // Update with complete englishSource (may have optional fields from top-level)
              slug: englishSource.slug,
              title: englishSource.title,
              // Only update optional fields if they're provided
              dayCharter: englishSource.dayCharter || yacht.translations.en.dayCharter || '',
              overnightCharter: englishSource.overnightCharter || yacht.translations.en.overnightCharter || '',
              aboutThisBoat: englishSource.aboutThisBoat || yacht.translations.en.aboutThisBoat || '',
              specifications: englishSource.specifications || yacht.translations.en.specifications || '',
              boatLayout: englishSource.boatLayout || yacht.translations.en.boatLayout || '',
              tags: (englishSource.tags && englishSource.tags.length > 0) ? englishSource.tags : (yacht.translations.en.tags || []),
            }
          };
          
          // Translate other languages if needed
          try {
            const newTranslations = await processTranslations(englishSource, YACHT_FIELD_CONFIG, translations);
            // Merge new translations with existing (preserve existing if new is empty)
            translations = {
              en: translations.en, // Keep our updated English
              fr: newTranslations.fr || translations.fr || translations.en,
              de: newTranslations.de || translations.de || translations.en,
              ru: newTranslations.ru || translations.ru || translations.en,
              zh: newTranslations.zh || translations.zh || translations.en,
              th: newTranslations.th || translations.th || translations.en,
              ar: newTranslations.ar || translations.ar || translations.en,
            };
            logger.info(`✅ Translations updated successfully for yacht: ${yacht._id}`);
          } catch (translationError) {
            logger.warn(`⚠️ Translation update failed for yacht ${yacht._id}, using existing translations:`, translationError.message);
            // Keep the translations we built above (with preserved English)
          }
        } else {
          // Scenario B: No existing translations.en - do full translation
          try {
            translations = await processTranslations(englishSource, YACHT_FIELD_CONFIG, yacht.translations);
            logger.info(`✅ Translations processed successfully for yacht: ${yacht._id}`);
            
            // Ensure English is always present (required field)
            if (!translations || !translations.en) {
              throw new Error('Translations missing English data');
            }
          } catch (translationError) {
            logger.error(`⚠️ Translation failed for yacht ${yacht._id}, using English fallback:`, translationError.message);
            
            // Create translations object with English data only (safe fallback)
            const englishFallback = {
              slug: englishSource.slug,
              title: englishSource.title,
              dayCharter: englishSource.dayCharter || '',
              overnightCharter: englishSource.overnightCharter || '',
              aboutThisBoat: englishSource.aboutThisBoat || '',
              specifications: englishSource.specifications || '',
              boatLayout: englishSource.boatLayout || '',
              tags: englishSource.tags || [],
            };
            
            translations = {
              en: englishFallback, // Required - always use English source
              // Preserve existing translations if available, otherwise use English as fallback
              fr: yacht.translations?.fr || englishFallback,
              de: yacht.translations?.de || englishFallback,
              ru: yacht.translations?.ru || englishFallback,
              zh: yacht.translations?.zh || englishFallback,
              th: yacht.translations?.th || englishFallback,
              ar: yacht.translations?.ar || englishFallback,
            };
            
            logger.warn(`⚠️ Using English-only translations for yacht ${yacht._id} due to translation failure`);
          }
        }

        // ------------------------------------------------------------------------
        // STEP 3.5: Validate translations before creating yacht
        // ------------------------------------------------------------------------
        if (!translations || !translations.en) {
          throw new Error('Invalid translations: English data is required');
        }
        if (!translations.en.slug || !translations.en.title) {
          throw new Error('Invalid translations: English slug and title are required');
        }

        // ------------------------------------------------------------------------
        // STEP 3.6: Build clean yacht data (no legacy translatable fields)
        // ------------------------------------------------------------------------
        // Strategy: Create new yacht with ONLY non-translatable fields + translations
        // DO NOT include legacy translatable fields (slug, title, dayCharter, etc.)
        // These fields should ONLY exist in translations.en, translations.fr, etc.
        
        // Validate required fields before building clean data
        if (!translations?.en?.slug) {
          throw new Error(`Missing required field: translations.en.slug`);
        }
        if (!yacht.type || !['crewed', 'bareboat'].includes(yacht.type)) {
          throw new Error(`Missing or invalid required field: type (must be 'crewed' or 'bareboat')`);
        }
        
        const cleanYachtData = {
          // Non-translatable fields (keep all - these are NOT in translations)
          boatType: yacht.boatType,
          price: yacht.price,
          capacity: yacht.capacity,
          length: yacht.length,
          lengthRange: yacht.lengthRange,
          cabins: yacht.cabins,
          bathrooms: yacht.bathrooms,
          passengerDayTrip: yacht.passengerDayTrip,
          passengerOvernight: yacht.passengerOvernight,
          guests: yacht.guests,
          guestsRange: yacht.guestsRange,
          dayTripPrice: yacht.dayTripPrice,
          overnightPrice: yacht.overnightPrice,
          daytripPriceEuro: yacht.daytripPriceEuro,
          primaryImage: yacht.primaryImage,
          galleryImages: yacht.galleryImages || [],
          videoLink: yacht.videoLink,
          badge: yacht.badge,
          design: yacht.design,
          built: yacht.built,
          cruisingSpeed: yacht.cruisingSpeed,
          lengthOverall: yacht.lengthOverall,
          fuelCapacity: yacht.fuelCapacity,
          waterCapacity: yacht.waterCapacity,
          code: yacht.code,
          type: yacht.type, // Required field - must be 'crewed' or 'bareboat'
          status: yacht.status || 'draft',
          displayOrder: yacht.displayOrder || 9999,
          // Translations (required) - contains: slug, title, dayCharter, overnightCharter, aboutThisBoat, specifications, boatLayout, tags
          translations: translations,
          // Explicitly DO NOT include these legacy translatable fields (they are in translations now):
          // - slug, title, dayCharter, overnightCharter, aboutThisBoat, specifications, boatLayout, tags
        };
        
        // Log validation before creation
        logger.info(`✅ Clean yacht data validated:`);
        logger.info(`   - Type: ${cleanYachtData.type} (required)`);
        logger.info(`   - Status: ${cleanYachtData.status}`);
        logger.info(`   - translations.en.slug: "${cleanYachtData.translations.en.slug}" (required)`);
        logger.info(`   - translations.en.title: "${cleanYachtData.translations.en.title || 'N/A'}"`);

        // ------------------------------------------------------------------------
        // STEP 3.7: Create new yacht and delete old one
        // ------------------------------------------------------------------------
        logger.info(`📝 Creating NEW yacht for: ${yacht._id} - "${englishSource.title}"`);
        
        // Step 3.7.1: CREATE new yacht FIRST (fresh document, new _id)
        let newYacht;
        try {
          // Check if slug already exists (might be from previous failed migration)
          const existingSlug = cleanYachtData.translations?.en?.slug;
          if (existingSlug) {
            const existingYacht = await Yacht.findOne({ 
              'translations.en.slug': existingSlug,
              _id: { $ne: yacht._id } // Exclude the old yacht we're migrating
            }).lean().exec();
            
            if (existingYacht) {
              logger.warn(`⚠️ Slug "${existingSlug}" already exists in yacht ${existingYacht._id}`);
              logger.warn(`   - This might be from a previous migration attempt`);
              logger.warn(`   - Will try to delete the duplicate and create new one`);
              
              // Delete the duplicate yacht if it exists
              await Yacht.findByIdAndDelete(existingYacht._id);
              logger.info(`   - Deleted duplicate yacht: ${existingYacht._id}`);
            }
          }
          
          // Log the data being created for debugging
          logger.info(`📋 Creating yacht with data:`, {
            slug: cleanYachtData.translations?.en?.slug,
            title: cleanYachtData.translations?.en?.title,
            type: cleanYachtData.type,
            status: cleanYachtData.status,
            hasTranslations: !!cleanYachtData.translations,
            hasTranslationsEn: !!cleanYachtData.translations?.en,
          });
          
          newYacht = await Yacht.create(cleanYachtData);
          logger.info(`✅ NEW yacht created with ID: ${newYacht._id} (old ID: ${yacht._id})`);
        } catch (createError) {
          // Enhanced error logging
          const errorMessage = createError.message || 'Unknown error';
          const errorDetails = createError.errors ? JSON.stringify(createError.errors, null, 2) : '';
          const errorName = createError.name || 'UnknownError';
          
          logger.error(`❌ Failed to create new yacht for ${yacht._id}:`);
          logger.error(`   - Error name: ${errorName}`);
          logger.error(`   - Error message: ${errorMessage}`);
          if (errorDetails) {
            logger.error(`   - Validation errors: ${errorDetails}`);
          }
          if (createError.code) {
            logger.error(`   - Error code: ${createError.code}`);
          }
          if (createError.keyPattern) {
            logger.error(`   - Duplicate key pattern: ${JSON.stringify(createError.keyPattern)}`);
          }
          if (createError.keyValue) {
            logger.error(`   - Duplicate key value: ${JSON.stringify(createError.keyValue)}`);
          }
          // Log the problematic data
          logger.error(`   - Clean yacht data keys: ${Object.keys(cleanYachtData).join(', ')}`);
          logger.error(`   - Translations.en keys: ${cleanYachtData.translations?.en ? Object.keys(cleanYachtData.translations.en).join(', ') : 'N/A'}`);
          logger.error(`   - Type: ${cleanYachtData.type}`);
          logger.error(`   - Slug: ${cleanYachtData.translations?.en?.slug}`);
          
          throw new Error(`Yacht creation failed: ${errorName} - ${errorMessage}${errorDetails ? ` - ${errorDetails}` : ''}`);
        }

        // Step 3.7.2: DELETE old yacht AFTER new one is created successfully
        logger.info(`🗑️ Deleting old yacht: ${yacht._id}`);
        
        const deletedYacht = await Yacht.findByIdAndDelete(yacht._id);
        
        if (!deletedYacht) {
          // Try alternative method if findByIdAndDelete fails
          logger.warn(`⚠️ findByIdAndDelete returned null, trying deleteOne...`);
          const deleteResult = await Yacht.deleteOne({ _id: yacht._id });
          
          if (deleteResult.deletedCount === 0) {
            logger.error(`❌ FAILED to delete old yacht ${yacht._id}`);
            // Verify if yacht still exists
            const verifyDelete = await Yacht.findById(yacht._id).lean().exec();
            if (verifyDelete) {
              logger.error(`   - ❌ Old yacht STILL EXISTS in database!`);
              results.errors.push({
                id: yacht._id.toString(),
                error: 'Old yacht could not be deleted',
                newYachtId: newYacht._id.toString(),
              });
            }
          } else {
            logger.info(`✅ Old yacht deleted using deleteOne: ${yacht._id}`);
          }
        } else {
          logger.info(`✅ Old yacht deleted successfully: ${yacht._id}`);
        }

        // ------------------------------------------------------------------------
        // STEP 3.8: Migration complete for this yacht
        // ------------------------------------------------------------------------
        results.successful++;
        logger.info(`✅ Migrated yacht: ${yacht._id} -> ${newYacht._id} - "${englishSource.title}"`);
      } catch (error) {
        logger.error(`❌ Failed to migrate yacht ${yacht._id}:`, error.message);
        results.failed++;
        results.errors.push({
          id: yacht._id,
          error: error.message || 'Unknown error',
        });
      }
    }

    // ============================================================================
    // STEP 4: Clear cache and return results
    // ============================================================================
    logger.info('🗑️ Clearing yacht cache after migration (force mode)...');
    try {
      await clearYachtCache(true); // Force clear
      logger.info('✅ Yacht cache cleared successfully');
    } catch (cacheError) {
      logger.error('⚠️ Cache clear had issues (non-fatal):', cacheError.message);
      try {
        await clearYachtCache(false);
        logger.info('✅ Yacht cache cleared on retry');
      } catch (retryError) {
        logger.error('❌ Cache clear failed on retry:', retryError.message);
      }
    }

    logger.info(`✅ Yacht migration completed:`);
    logger.info(`   - Successful: ${results.successful}`);
    logger.info(`   - Failed: ${results.failed}`);
    logger.info(`   - Skipped: ${results.skipped || 0} (already clean)`);
    logger.info(`📊 Processed ${results.processed} of ${results.total} yachts (limit: ${MIGRATION_LIMIT})`);

    return SuccessHandler(
      results,
      200,
      `Migration completed: ${results.successful} successful, ${results.failed} failed, ${results.skipped || 0} skipped. Processed ${results.processed} of ${results.total} yachts.`,
      res
    );
  } catch (err) {
    logger.error('❌ Yacht migration error:', err);
    next(new ApiError(err.message || 'Migration failed', 500));
  }
};

/**
 * Internal function to migrate blogs (without HTTP response)
 */
async function migrateBlogsInternal() {
  const blogsToMigrate = await Blog.find({
    $or: [
      { translations: { $exists: false } },
      { 'translations.en': { $exists: false } },
      { 
        $and: [
          { slug: { $exists: true } },
          { 'translations.en.slug': { $exists: false } }
        ]
      },
      // Blogs that have translations but still have legacy fields (cleanup)
      {
        $and: [
          { 'translations.en': { $exists: true } },
          {
            $or: [
              { slug: { $exists: true } },
              { title: { $exists: true } },
              { shortDescription: { $exists: true } },
              { detailDescription: { $exists: true } }
            ]
          }
        ]
      }
    ]
  }).lean().exec();

  if (blogsToMigrate.length === 0) {
    return { total: 0, successful: 0, failed: 0, errors: [] };
  }

  const results = {
    total: blogsToMigrate.length,
    successful: 0,
    failed: 0,
    errors: [],
  };

  for (const blog of blogsToMigrate) {
    try {
      const hasLegacyFields = blog.slug || blog.title || blog.shortDescription || blog.detailDescription;
      const hasEnglishTranslation = blog.translations?.en;

      let englishSource;
      let needsTranslation = false;

      if (hasLegacyFields && !hasEnglishTranslation) {
        // Migrate from legacy format - needs translation
        englishSource = {
          slug: blog.slug || '',
          title: blog.title || '',
          shortDescription: blog.shortDescription || '',
          detailDescription: blog.detailDescription || '',
        };
        needsTranslation = true;
      } else if (hasEnglishTranslation && hasLegacyFields) {
        // Blog already has translations.en but still has legacy fields - just cleanup
        const updateData = {
          $unset: {
            slug: '',
            title: '',
            shortDescription: '',
            detailDescription: '',
          },
        };
        await Blog.findByIdAndUpdate(blog._id, updateData, { new: true });
        results.successful++;
        continue; // Skip translation step
      } else if (hasEnglishTranslation) {
        // Blog already has translations.en, just ensure other languages are translated
        englishSource = {
          slug: blog.translations.en.slug || blog.slug || '',
          title: blog.translations.en.title || '',
          shortDescription: blog.translations.en.shortDescription || '',
          detailDescription: blog.translations.en.detailDescription || '',
        };
        needsTranslation = true;
      } else {
        results.failed++;
        results.errors.push({ id: blog._id, error: 'No data to migrate' });
        continue;
      }

      // Only process translations if needed
      if (needsTranslation) {
        if (!englishSource.slug || !englishSource.title) {
          results.failed++;
          results.errors.push({ id: blog._id, error: 'Missing required fields' });
          continue;
        }

        const translations = await processTranslations(englishSource, BLOG_FIELD_CONFIG, blog.translations);

        const updateData = {
          $set: {
            translations,
          },
          $unset: {
            slug: '',
            title: '',
            shortDescription: '',
            detailDescription: '',
          },
        };

        await Blog.findByIdAndUpdate(blog._id, updateData, { new: true });
      }
      
      results.successful++;
    } catch (error) {
      results.failed++;
      results.errors.push({ id: blog._id, error: error.message || 'Unknown error' });
    }
  }

  await clearBlogCache(true); // Force clear after cleanup
  return results;
}

/**
 * Internal function to migrate yachts (without HTTP response)
 */
async function migrateYachtsInternal() {
  const yachtsToMigrate = await Yacht.find({
    $or: [
      { translations: { $exists: false } },
      { 'translations.en': { $exists: false } },
      { 
        $and: [
          { slug: { $exists: true } },
          { 'translations.en.slug': { $exists: false } }
        ]
      }
    ]
  }).lean().exec();

  if (yachtsToMigrate.length === 0) {
    return { total: 0, successful: 0, failed: 0, errors: [] };
  }

  const results = {
    total: yachtsToMigrate.length,
    successful: 0,
    failed: 0,
    errors: [],
  };

  for (const yacht of yachtsToMigrate) {
    try {
      // Check if yacht has legacy top-level translatable fields
      // Note: title exists both as top-level (legacy) and in translations.en.title (duplicate)
      const hasLegacyFields = yacht.slug || yacht.title || yacht.dayCharter || 
                              yacht.overnightCharter || yacht.aboutThisBoat || 
                              yacht.specifications || yacht.boatLayout || yacht.tags;
      const hasEnglishTranslation = yacht.translations?.en;

      let englishSource;

      if (hasLegacyFields && !hasEnglishTranslation) {
        englishSource = {
          slug: yacht.slug || '',
          title: yacht.title || '',
          dayCharter: yacht.dayCharter || '',
          overnightCharter: yacht.overnightCharter || '',
          aboutThisBoat: yacht.aboutThisBoat || '',
          specifications: yacht.specifications || '',
          boatLayout: yacht.boatLayout || '',
          tags: yacht.tags || [],
        };
      } else if (hasEnglishTranslation) {
        englishSource = {
          slug: yacht.translations.en.slug || yacht.slug || '',
          title: yacht.translations.en.title || yacht.title || '',
          dayCharter: yacht.translations.en.dayCharter || yacht.dayCharter || '',
          overnightCharter: yacht.translations.en.overnightCharter || yacht.overnightCharter || '',
          aboutThisBoat: yacht.translations.en.aboutThisBoat || yacht.aboutThisBoat || '',
          specifications: yacht.translations.en.specifications || yacht.specifications || '',
          boatLayout: yacht.translations.en.boatLayout || yacht.boatLayout || '',
          tags: yacht.translations.en.tags || yacht.tags || [],
        };
      } else {
        results.failed++;
        results.errors.push({ id: yacht._id, error: 'No data to migrate' });
        continue;
      }

      if (!englishSource.slug || !englishSource.title) {
        results.failed++;
        results.errors.push({ id: yacht._id, error: 'Missing required fields' });
        continue;
      }

      const translations = await processTranslations(englishSource, YACHT_FIELD_CONFIG, yacht.translations);

        // Update yacht with new structure
        // Note: Yachts keep legacy top-level fields for backward compatibility
        // If you want to remove them, uncomment the $unset section below
        const updateData = {
          $set: {
            translations,
            // Keep legacy fields in sync with English for backward compatibility
            slug: englishSource.slug,
            title: englishSource.title,
            dayCharter: englishSource.dayCharter,
            overnightCharter: englishSource.overnightCharter,
            aboutThisBoat: englishSource.aboutThisBoat,
            specifications: englishSource.specifications,
            boatLayout: englishSource.boatLayout,
            tags: englishSource.tags,
          },
          // Uncomment below to remove legacy fields (not recommended for yachts)
          // $unset: {
          //   title: '',
          //   dayCharter: '',
          //   overnightCharter: '',
          //   aboutThisBoat: '',
          //   specifications: '',
          //   boatLayout: '',
          //   tags: '',
          // },
        };

        await Yacht.findByIdAndUpdate(yacht._id, updateData, { new: true });
      results.successful++;
    } catch (error) {
      results.failed++;
      results.errors.push({ id: yacht._id, error: error.message || 'Unknown error' });
    }
  }

  await clearYachtCache(true); // Force clear after cleanup
  return results;
}

/**
 * Migrate both blogs and yachts
 */
export const migrateAll = async (req, res, next) => {
  try {
    logger.info('🔄 Starting full migration (blogs + yachts)...');

    const [blogResults, yachtResults] = await Promise.all([
      migrateBlogsInternal(),
      migrateYachtsInternal(),
    ]);

    logger.info(`✅ Full migration completed: Blogs (${blogResults.successful}/${blogResults.total}), Yachts (${yachtResults.successful}/${yachtResults.total})`);

    return SuccessHandler(
      {
        blogs: blogResults,
        yachts: yachtResults,
      },
      200,
      'Full migration completed',
      res
    );
  } catch (err) {
    logger.error('❌ Full migration error:', err);
    next(new ApiError(err.message || 'Migration failed', 500));
  }
};

/**
 * Cleanup legacy fields from blogs that already have translations
 * This is a cleanup-only operation - no translation needed
 * Removes: slug, title, shortDescription, detailDescription from top level
 */
export const cleanupBlogLegacyFields = async (req, res, next) => {
  try {
    logger.info('🧹 Starting blog legacy fields cleanup...');

    // Find ALL blogs that have legacy top-level fields (regardless of translations)
    // This ensures we catch all blogs that need cleanup
    const blogsToCleanup = await Blog.find({
      $or: [
        { slug: { $exists: true, $ne: null } },
        { title: { $exists: true, $ne: null } },
        { shortDescription: { $exists: true, $ne: null } },
        { detailDescription: { $exists: true, $ne: null } }
      ]
    }).select('_id translations').lean().exec();

    if (blogsToCleanup.length === 0) {
      return SuccessHandler(
        { cleaned: 0, message: 'No blogs need cleanup' },
        200,
        'Cleanup completed',
        res
      );
    }

    logger.info(`🧹 Found ${blogsToCleanup.length} blog(s) with legacy fields to cleanup`);

    const results = {
      total: blogsToCleanup.length,
      successful: 0,
      failed: 0,
      errors: [],
    };

    // Process each blog individually to ensure proper cleanup
    for (const blog of blogsToCleanup) {
      try {
        // Build unset object - only unset fields that actually exist
        const unsetFields = {};
        
        // Check which legacy fields exist and add them to unset
        if (blog.slug !== undefined && blog.slug !== null) {
          unsetFields.slug = '';
        }
        if (blog.title !== undefined && blog.title !== null) {
          unsetFields.title = '';
        }
        if (blog.shortDescription !== undefined && blog.shortDescription !== null) {
          unsetFields.shortDescription = '';
        }
        if (blog.detailDescription !== undefined && blog.detailDescription !== null) {
          unsetFields.detailDescription = '';
        }

        // Only update if there are fields to remove
        if (Object.keys(unsetFields).length > 0) {
          const updateData = {
            $unset: unsetFields,
          };

          // Use updateOne for more direct control
          await Blog.updateOne(
            { _id: blog._id },
            updateData
          );

          results.successful++;
          const blogTitle = blog.translations?.en?.title || blog.title || 'Untitled';
          logger.info(`✅ Cleaned up legacy fields for blog: ${blog._id} - "${blogTitle}"`);
        } else {
          // No fields to remove, skip
          logger.info(`⏭️ Skipping blog ${blog._id}: No legacy fields found`);
        }
      } catch (error) {
        logger.error(`❌ Failed to cleanup blog ${blog._id}:`, error.message);
        results.failed++;
        results.errors.push({
          id: blog._id,
          error: error.message || 'Unknown error',
        });
      }
    }

    // Clear cache after cleanup
    await clearBlogCache(true); // Force clear after cleanup

    logger.info(`✅ Blog cleanup completed: ${results.successful} successful, ${results.failed} failed`);

    return SuccessHandler(
      results,
      200,
      `Cleanup completed: ${results.successful} successful, ${results.failed} failed`,
      res
    );
  } catch (err) {
    logger.error('❌ Blog cleanup error:', err);
    next(new ApiError(err.message || 'Cleanup failed', 500));
  }
};

/**
 * Force cleanup specific blog by ID
 * Useful for cleaning up individual blogs that still have legacy fields
 */
export const cleanupBlogById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return next(new ApiError('Blog ID is required', 400));
    }

    logger.info(`🧹 Cleaning up legacy fields for blog: ${id}`);

    // Find the blog
    const blog = await Blog.findById(id).lean().exec();

    if (!blog) {
      return next(new ApiError('Blog not found', 404));
    }

    // Build unset object for all legacy fields
    const unsetFields = {};
    
    if (blog.slug !== undefined && blog.slug !== null) {
      unsetFields.slug = '';
    }
    if (blog.title !== undefined && blog.title !== null) {
      unsetFields.title = '';
    }
    if (blog.shortDescription !== undefined && blog.shortDescription !== null) {
      unsetFields.shortDescription = '';
    }
    if (blog.detailDescription !== undefined && blog.detailDescription !== null) {
      unsetFields.detailDescription = '';
    }

    if (Object.keys(unsetFields).length === 0) {
      return SuccessHandler(
        { id, message: 'No legacy fields found to remove' },
        200,
        'Blog already clean',
        res
      );
    }

    // Remove legacy fields
    await Blog.updateOne(
      { _id: id },
      { $unset: unsetFields }
    );

    // Clear cache
    await clearBlogCache(true); // Force clear after cleanup

    logger.info(`✅ Cleaned up legacy fields for blog: ${id}`);

    return SuccessHandler(
      { 
        id, 
        removedFields: Object.keys(unsetFields),
        message: 'Legacy fields removed successfully' 
      },
      200,
      'Blog cleaned up successfully',
      res
    );
  } catch (err) {
    logger.error('❌ Blog cleanup by ID error:', err);
    next(new ApiError(err.message || 'Cleanup failed', 500));
  }
};

/**
 * Recreate blog with clean structure (removes all legacy fields)
 * APPROACH: 
 * 1. CREATE new blog FIRST (completely fresh document)
 * 2. DELETE old blog AFTER (completely remove)
 * This ensures we have new data before deleting old
 */
export const recreateBlogClean = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return next(new ApiError('Blog ID is required', 400));
    }

    logger.info(`🔄 Starting blog recreation: ${id}`);
    logger.info(`📋 Step 1: Finding old blog...`);

    // STEP 1: Find the existing blog
    const existingBlog = await Blog.findById(id).lean().exec();

    if (!existingBlog) {
      return next(new ApiError('Blog not found', 404));
    }

    logger.info(`✅ Found old blog: ${id}`);
    logger.info(`📋 Step 2: Extracting clean data (excluding legacy fields)...`);

    // STEP 2: Build clean object manually - ONLY include allowed fields
    // This ensures NO legacy fields are included in the new blog
    const cleanBlogData = {
      image: existingBlog.image,
      status: existingBlog.status || 'draft',
      translations: existingBlog.translations ? { ...existingBlog.translations } : {},
    };
    
    // CRITICAL: Do NOT include these legacy fields (they will NOT be in new blog):
    // - existingBlog.slug ❌
    // - existingBlog.title ❌
    // - existingBlog.shortDescription ❌
    // - existingBlog.detailDescription ❌
    
    // Verify clean data structure
    logger.info(`📋 Clean data structure:`);
    logger.info(`   - image: ${!!cleanBlogData.image}`);
    logger.info(`   - status: ${cleanBlogData.status}`);
    logger.info(`   - translations: ${!!cleanBlogData.translations}`);
    logger.info(`   - slug (legacy): NOT INCLUDED ✅`);
    logger.info(`   - title (legacy): NOT INCLUDED ✅`);
    logger.info(`   - shortDescription (legacy): NOT INCLUDED ✅`);
    logger.info(`   - detailDescription (legacy): NOT INCLUDED ✅`);

    logger.info(`✅ Clean data extracted. Legacy fields excluded.`);

    // Validate translations.en exists (required)
    if (!cleanBlogData.translations.en) {
      if (existingBlog.slug || existingBlog.title) {
        return next(new ApiError('Blog has no translations.en. Please migrate first using /api/migrate/blogs', 400));
      }
      return next(new ApiError('Blog has no translations data', 400));
    }

    // Validate that translations.en has required fields
    if (!cleanBlogData.translations.en.slug || !cleanBlogData.translations.en.title) {
      return next(new ApiError('Blog translations.en is missing required fields (slug or title)', 400));
    }

    logger.info(`📋 Step 3: Creating NEW blog (fresh document, new _id)...`);

    // STEP 3: CREATE NEW blog FIRST - completely fresh document
    // This will create a NEW document with a NEW _id
    // Only includes: image, status, translations (NO legacy fields)
    const newBlog = await Blog.create(cleanBlogData);
    
    // Verify new blog structure
    const newBlogData = newBlog.toObject();
    const hasLegacyFields = !!(newBlogData.slug || newBlogData.title || newBlogData.shortDescription || newBlogData.detailDescription);
    
    logger.info(`✅ NEW blog created successfully!`);
    logger.info(`   - New ID: ${newBlog._id}`);
    logger.info(`   - Has image: ${!!newBlog.image}`);
    logger.info(`   - Has status: ${!!newBlog.status}`);
    logger.info(`   - Has translations: ${!!newBlog.translations}`);
    logger.info(`   - Has legacy fields: ${hasLegacyFields} (should be false)`);
    
    if (hasLegacyFields) {
      logger.error(`❌ ERROR: New blog has legacy fields! This should not happen.`);
      logger.error(`   Legacy fields found:`, {
        slug: !!newBlogData.slug,
        title: !!newBlogData.title,
        shortDescription: !!newBlogData.shortDescription,
        detailDescription: !!newBlogData.detailDescription,
      });
    }

    logger.info(`📋 Step 4: Deleting OLD blog completely...`);

    // STEP 4: DELETE OLD blog completely (not update, DELETE)
    const deleteResult = await Blog.deleteOne({ _id: id });
    
    if (deleteResult.deletedCount === 0) {
      logger.warn(`⚠️ Failed to delete old blog ${id}, but new blog ${newBlog._id} was created`);
    } else {
      logger.info(`✅ Old blog DELETED successfully!`);
      logger.info(`   - Deleted ID: ${id}`);
      logger.info(`   - Documents removed: ${deleteResult.deletedCount}`);
    }

    // Clear cache
    await clearBlogCache(true); // Force clear after recreation

    logger.info(`✅ Blog recreation completed successfully!`);
    logger.info(`   - Old ID: ${id} (DELETED)`);
    logger.info(`   - New ID: ${newBlog._id} (CREATED)`);

    return SuccessHandler(
      {
        oldId: id,
        newId: newBlog._id.toString(),
        message: 'Blog recreated with clean structure (legacy fields removed)',
        blog: {
          _id: newBlog._id,
          image: newBlog.image,
          status: newBlog.status,
          translations: newBlog.translations,
          // Explicitly show no legacy fields
          hasLegacyFields: false,
        },
        oldBlogDeleted: deleteResult.deletedCount > 0,
        deletedCount: deleteResult.deletedCount,
      },
      200,
      'Blog recreated successfully',
      res
    );
  } catch (err) {
    logger.error('❌ Blog recreation error:', err);
    next(new ApiError(err.message || 'Blog recreation failed', 500));
  }
};

/**
 * Recreate all blogs with clean structure
 * Approach: Create new blog FIRST, then delete old blog
 * Processes all blogs and ensures they have no legacy fields
 */
export const recreateAllBlogsClean = async (req, res, next) => {
  try {
    logger.info('🔄 Starting blog recreation with clean structure...');

    // Find all blogs
    const allBlogs = await Blog.find({}).lean().exec();

    if (allBlogs.length === 0) {
      return SuccessHandler(
        { recreated: 0, message: 'No blogs found' },
        200,
        'Recreation completed',
        res
      );
    }

    logger.info(`📝 Found ${allBlogs.length} blog(s) to process`);

    const results = {
      total: allBlogs.length,
      successful: 0,
      failed: 0,
      errors: [],
      recreated: [],
    };

    // Process each blog
    for (const blog of allBlogs) {
      try {
        // Check if blog has legacy fields
        const hasLegacyFields = blog.slug || blog.title || blog.shortDescription || blog.detailDescription;

        // If no legacy fields and already has clean structure, skip
        if (!hasLegacyFields && blog.translations?.en) {
          logger.info(`⏭️ Skipping blog ${blog._id}: Already has clean structure`);
          results.successful++;
          continue;
        }

        // Extract ONLY clean data - explicitly exclude legacy fields
        const cleanBlogData = {
          image: blog.image,
          status: blog.status || 'draft',
          translations: blog.translations || {},
          // Explicitly DO NOT include: slug, title, shortDescription, detailDescription
        };

        // Ensure translations.en exists
        if (!cleanBlogData.translations.en) {
          results.failed++;
          results.errors.push({
            id: blog._id.toString(),
            error: 'No translations.en found',
          });
          continue;
        }

        // Validate required fields
        if (!cleanBlogData.translations.en.slug || !cleanBlogData.translations.en.title) {
          results.failed++;
          results.errors.push({
            id: blog._id.toString(),
            error: 'Missing required fields in translations.en',
          });
          continue;
        }

        const oldId = blog._id.toString();
        const oldTitle = cleanBlogData.translations.en.title;

        // STEP 1: Create NEW blog with clean structure FIRST (fresh document)
        logger.info(`📝 Creating NEW blog for: ${oldId} - "${oldTitle}"`);
        const newBlog = await Blog.create(cleanBlogData);
        logger.info(`✅ NEW blog created with ID: ${newBlog._id}`);

        // STEP 2: DELETE OLD blog completely (not update, DELETE)
        logger.info(`🗑️ DELETING old blog completely: ${oldId}`);
        const deleteResult = await Blog.deleteOne({ _id: blog._id });
        
        if (deleteResult.deletedCount === 0) {
          logger.warn(`⚠️ Failed to delete old blog ${oldId}, but new blog ${newBlog._id} was created`);
        } else {
          logger.info(`✅ Old blog DELETED successfully: ${oldId} (${deleteResult.deletedCount} document(s) removed)`);
        }

        results.successful++;
        results.recreated.push({
          oldId: oldId,
          newId: newBlog._id.toString(),
          title: oldTitle,
          oldBlogDeleted: !!deleteResult,
        });

        logger.info(`✅ Recreated blog: ${oldId} -> ${newBlog._id} - "${oldTitle}"`);
      } catch (error) {
        logger.error(`❌ Failed to recreate blog ${blog._id}:`, error.message);
        results.failed++;
        results.errors.push({
          id: blog._id.toString(),
          error: error.message || 'Unknown error',
        });
      }
    }

    // Clear cache after recreation
    await clearBlogCache(true); // Force clear after recreation

    logger.info(`✅ Blog recreation completed: ${results.successful} successful, ${results.failed} failed`);

    return SuccessHandler(
      results,
      200,
      `Recreation completed: ${results.successful} successful, ${results.failed} failed`,
      res
    );
  } catch (err) {
    logger.error('❌ Blog recreation error:', err);
    next(new ApiError(err.message || 'Recreation failed', 500));
  }
};

/**
 * Validate which yachts need migration (without actually migrating)
 * Useful for checking migration status before running migration
 */
export const validateYachtMigration = async (req, res, next) => {
  try {
    logger.info('🔍 Validating yacht migration status...');

    // Use the same query as migrateYachts to find yachts needing migration
    const yachtsNeedingMigration = await Yacht.find({
      $or: [
        { translations: { $exists: false } },
        { 'translations.en': { $exists: false } },
        {
          $or: [
            { 'translations.en.slug': { $exists: false } },
            { 'translations.en.slug': null },
            { 'translations.en.slug': '' },
            { 'translations.en.title': { $exists: false } },
            { 'translations.en.title': null },
            { 'translations.en.title': '' }
          ]
        },
        { 
          $and: [
            { slug: { $exists: true, $ne: null, $ne: '' } },
            {
              $or: [
                { 'translations.en.slug': { $exists: false } },
                { 'translations.en.slug': null },
                { 'translations.en.slug': '' }
              ]
            }
          ]
        },
        { 
          $and: [
            { title: { $exists: true, $ne: null, $ne: '' } },
            {
              $or: [
                { 'translations.en.title': { $exists: false } },
                { 'translations.en.title': null },
                { 'translations.en.title': '' }
              ]
            }
          ]
        },
        {
          $and: [
            { 'translations.en': { $exists: true } },
            { 'translations.en.slug': { $exists: true, $ne: null, $ne: '' } },
            { 'translations.en.title': { $exists: true, $ne: null, $ne: '' } },
            {
              $or: [
                { slug: { $exists: true, $ne: null, $ne: '' } },
                { title: { $exists: true, $ne: null, $ne: '' } },
                { dayCharter: { $exists: true, $ne: null, $ne: '' } },
                { overnightCharter: { $exists: true, $ne: null, $ne: '' } },
                { aboutThisBoat: { $exists: true, $ne: null, $ne: '' } },
                { specifications: { $exists: true, $ne: null, $ne: '' } },
                { boatLayout: { $exists: true, $ne: null, $ne: '' } }
              ]
            }
          ]
        }
      ]
    })
    .select('_id slug title dayCharter overnightCharter aboutThisBoat specifications boatLayout tags translations boatType status')
    .lean()
    .exec();

    // Analyze each yacht with detailed information
    const analysis = yachtsNeedingMigration.map(yacht => {
      // Check for legacy fields (non-empty only)
      const legacyFields = [];
      if (yacht.slug && yacht.slug.trim() !== '') legacyFields.push('slug');
      if (yacht.title && yacht.title.trim() !== '') legacyFields.push('title');
      if (yacht.dayCharter && yacht.dayCharter.trim() !== '') legacyFields.push('dayCharter');
      if (yacht.overnightCharter && yacht.overnightCharter.trim() !== '') legacyFields.push('overnightCharter');
      if (yacht.aboutThisBoat && yacht.aboutThisBoat.trim() !== '') legacyFields.push('aboutThisBoat');
      if (yacht.specifications && yacht.specifications.trim() !== '') legacyFields.push('specifications');
      if (yacht.boatLayout && yacht.boatLayout.trim() !== '') legacyFields.push('boatLayout');
      if (yacht.tags && Array.isArray(yacht.tags) && yacht.tags.length > 0) legacyFields.push('tags');
      
      const hasLegacyFields = legacyFields.length > 0;
      const hasTranslations = !!yacht.translations;
      const hasTranslationsEn = !!yacht.translations?.en;
      const hasRequiredSlug = !!(yacht.translations?.en?.slug && yacht.translations.en.slug.trim() !== '');
      const hasRequiredTitle = !!(yacht.translations?.en?.title && yacht.translations.en.title.trim() !== '');
      const hasEnglishTranslation = hasTranslationsEn && hasRequiredSlug && hasRequiredTitle;
      
      // Determine reasons for migration
      let reasons = [];
      if (!yacht.translations) {
        reasons.push('❌ No translations object');
      } else if (!yacht.translations.en) {
        reasons.push('❌ No translations.en object');
      } else {
        if (!hasRequiredSlug) reasons.push('❌ Missing translations.en.slug');
        if (!hasRequiredTitle) reasons.push('❌ Missing translations.en.title');
      }
      
      if (hasLegacyFields) {
        if (hasEnglishTranslation) {
          reasons.push(`⚠️ Has legacy fields (${legacyFields.join(', ')}) but also has translations.en - needs cleanup`);
        } else {
          reasons.push(`🔄 Has legacy fields (${legacyFields.join(', ')}) but no valid translations.en - needs migration`);
        }
      }

      return {
        id: yacht._id.toString(),
        title: yacht.title || yacht.translations?.en?.title || 'Untitled',
        slug: yacht.slug || yacht.translations?.en?.slug || 'No slug',
        hasLegacyFields,
        legacyFieldsList: legacyFields,
        hasTranslations,
        hasTranslationsEn,
        hasEnglishTranslation,
        reasons: reasons,
        status: yacht.status,
        boatType: yacht.boatType,
      };
    });

    const total = yachtsNeedingMigration.length;
    const withLegacyFields = analysis.filter(a => a.hasLegacyFields).length;
    const withoutTranslations = analysis.filter(a => !a.hasTranslations).length;
    const needsMigration = analysis.filter(a => a.hasLegacyFields && !a.hasEnglishTranslation).length;
    const needsCleanup = analysis.filter(a => a.hasLegacyFields && a.hasEnglishTranslation).length;

    logger.info(`📊 Validation complete: ${total} yacht(s) need migration`);
    logger.info(`   - With legacy fields: ${withLegacyFields}`);
    logger.info(`   - Without translations: ${withoutTranslations}`);
    logger.info(`   - Needs migration: ${needsMigration}`);
    logger.info(`   - Needs cleanup: ${needsCleanup}`);

    return SuccessHandler(
      {
        total,
        summary: {
          withLegacyFields,
          withoutTranslations,
          needsMigration,
          needsCleanup,
        },
        yachts: analysis,
      },
      200,
      `Found ${total} yacht(s) needing migration`,
      res
    );
  } catch (err) {
    logger.error('❌ Yacht migration validation error:', err);
    next(new ApiError(err.message || 'Validation failed', 500));
  }
};

export default {
  migrateBlogs,
  migrateYachts,
  migrateAll,
  cleanupBlogLegacyFields,
  cleanupBlogById,
  recreateBlogClean,
  recreateAllBlogsClean,
  validateYachtMigration,
};

