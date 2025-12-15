import logger from '../functions/logger.js';
import Blog from '../models/blog.js';
import ApiError from '../utils/ApiError.js';
import SuccessHandler from '../utils/SuccessHandler.js';
import { clearBlogCache } from '../utils/cache.js';
import { uploadToCloudinary } from '../utils/cloudinaryUtil.js';
import paginate from '../utils/paginate.js';
import { processTranslations } from '../utils/translationHelper.js';
import { BLOG_FIELD_CONFIG } from '../utils/translationService.js';
import {
  addBlogSchema,
  deleteBlogSchema,
  editBlogSchema,
  getBlogByIdSchema,
  getBlogBySlugSchema,
  updateBlogStatusSchema,
} from '../validations/blog.validation.js';

const normalizeSlug = (value) => value?.trim()?.toLowerCase();
const isValidSlug = (value) => /^[a-z0-9-]+$/.test(value || '');

const getSlugOrFail = (data) => {
  const rawSlug = data?.slug || data?.translations?.en?.slug;
  const normalized = normalizeSlug(rawSlug);
  if (!normalized) {
    throw new ApiError('Slug is required', 400);
  }
  if (!isValidSlug(normalized)) {
    throw new ApiError('Slug can only contain lowercase letters, numbers, and hyphens', 400);
  }
  return normalized;
};

// Add a new blog
export const addBlog = async (req, res, next) => {
  try {
    logger.info('📝 Add blog request received');

    let blogData = req.body;

    // Check if image is uploaded
    if (!req.files || !req.files.image || !req.files.image[0]) {
      return next(new ApiError('Blog image is required', 400));
    }

    // Upload image to Cloudinary
    if (req.files && req.files.image && req.files.image[0]) {
      try {
        const file = req.files.image[0];

        // Check file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB in bytes
        if (file.size > maxSize) {
          return next(
            new ApiError(
              `Image file size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size of 10MB`,
              400
            )
          );
        }

        logger.info(
          `📸 Uploading blog image: ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)}MB)`
        );
        // File path logging removed for security

        // Small delay to ensure file is fully written
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify file exists before uploading
        const fs = await import('fs/promises');
        try {
          await fs.access(file.path);
          logger.info('✅ Blog image file exists and is accessible');

          // Get file stats to verify it's not empty
          const stats = await fs.stat(file.path);
          // File size logging removed for security

          if (stats.size === 0) {
            return next(new ApiError('Blog image file is empty', 400));
          }
        } catch (accessError) {
          logger.error('❌ Blog image file does not exist:', file.path);
          logger.error('❌ Access error:', accessError.message);
          return next(
            new ApiError(`Blog image file not found: ${file.path}`, 500)
          );
        }

        blogData.image = await uploadToCloudinary(file.path, 'blogs/images');
        logger.info(`✅ Blog image uploaded successfully: ${blogData.image}`);
      } catch (uploadError) {
        logger.error(`❌ Blog image upload failed:`, uploadError);
        return next(
          new ApiError(
            `Failed to upload blog image: ${uploadError.message}`,
            400
          )
        );
      }
    }

    // Derive canonical slug from translations (or provided slug)
    try {
      blogData.slug = getSlugOrFail(blogData);
    } catch (slugError) {
      return next(slugError);
    }

    // Now validate blogData
    const { error } = addBlogSchema.validate(blogData);
    if (error) {
      logger.warn({
        message: error.details[0].message,
        timestamp: new Date().toISOString(),
      });
      return next(new ApiError(error.details[0].message, 400));
    }

    // Check if slug already exists
    const existingBlog = await Blog.findOne({ slug: blogData.slug });
    if (existingBlog) {
      logger.warn({
        message: `❌ Blog with slug already exists: ${blogData.slug}`,
        timestamp: new Date().toISOString(),
      });
      return next(new ApiError('Blog with this slug already exists', 409));
    }

    const translations = await processTranslations(blogData, BLOG_FIELD_CONFIG);

    // Prepare blog data with translations
    const blogToCreate = {
      slug: blogData.slug,
      image: blogData.image,
      status: blogData.status || 'draft',
      translations: translations || {},
    };

    const newBlog = await Blog.create(blogToCreate);
    // Invalidate blog caches so lists reflect the new item
    await clearBlogCache();

    logger.info({
      message: `✅ Blog created successfully: ${newBlog.translations?.en?.title || 'Untitled'}`,
      timestamp: new Date().toISOString(),
    });

    return SuccessHandler(newBlog, 201, 'Blog created successfully', res);
  } catch (err) {
    logger.error('❌ Add blog error:', err);
    next(new ApiError(err.message || 'Internal server error', 500));
  }
};

// Get all blogs
export const getAllBlogs = async (req, res, next) => {
  try {
    logger.info('📄 Get all blogs request received');

    const { page = 1, limit = 10, status } = req.query;
    const { skip, limit: parsedLimit } = paginate(page, limit);

    // Build query filter
    const filter = {};
    if (status && ['draft', 'published'].includes(status)) {
      filter.status = status;
    }

    // Use Promise.all for parallel execution and lean() for better performance
    const [blogs, total, recentlyUpdated] = await Promise.all([
      Blog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean()
        .exec(),
      Blog.countDocuments(filter).exec(),
      Blog.find(filter)
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(5)
        .lean()
        .exec(),
    ]);

    const response = {
      blogs,
      page: Number(page),
      limit: parsedLimit,
      total,
      totalPages: Math.ceil(total / parsedLimit),
      hasNextPage: Number(page) < Math.ceil(total / parsedLimit),
      hasPrevPage: Number(page) > 1,
      recentlyUpdated,
    };

    return SuccessHandler(response, 200, 'Blogs fetched successfully', res);
  } catch (err) {
    logger.error('❌ Get all blogs error:', err);
    next(new ApiError(err.message || 'Internal server error', 500));
  }
};

// Get blog by ID
export const getBlogById = async (req, res, next) => {
  try {
    logger.info('🔍 Get blog by ID request received');

    // Validate the query using Joi
    const { error } = getBlogByIdSchema.validate(req.query);
    if (error) {
      return next(new ApiError(error.details[0].message, 400));
    }

    const { id } = req.query;

    // Use lean() for better performance and return all fields
    const blog = await Blog.findById(id).lean().exec();

    if (!blog) {
      logger.warn({
        message: `❌ Blog not found for ID: ${id}`,
        timestamp: new Date().toISOString(),
      });
      return next(new ApiError('Blog not found', 404));
    }

    return SuccessHandler(blog, 200, 'Blog fetched successfully', res);
  } catch (err) {
    logger.error('❌ Get blog by ID error:', err);
    next(new ApiError(err.message || 'Internal server error', 500));
  }
};

// Get blog by slug
export const getBlogBySlug = async (req, res, next) => {
  try {
    logger.info('🔍 Get blog by slug request received');

    // Validate the query using Joi
    const { error } = getBlogBySlugSchema.validate(req.query);
    if (error) {
      return next(new ApiError(error.details[0].message, 400));
    }

    const { slug } = req.query;

    // Use lean() for better performance and return all fields
    const blog = await Blog.findOne({ slug }).lean().exec();

    if (!blog) {
      logger.warn({
        message: `❌ Blog not found for slug: ${slug}`,
        timestamp: new Date().toISOString(),
      });
      return next(new ApiError('Blog not found', 404));
    }

    return SuccessHandler(blog, 200, 'Blog fetched successfully', res);
  } catch (err) {
    logger.error('❌ Get blog by slug error:', err);
    next(new ApiError(err.message || 'Internal server error', 500));
  }
};
// Edit blog by ID
export const editBlog = async (req, res, next) => {
  try {
    logger.info('✏️ Edit blog request received');

    const { id } = req.query;
    let blogData = req.body;

    // Validate blog ID
    const { error: idError } = getBlogByIdSchema.validate({ id });
    if (idError) {
      return next(new ApiError(idError.details[0].message, 400));
    }

    // Check if blog exists
    const existingBlog = await Blog.findById(id);
    if (!existingBlog) {
      return next(new ApiError('Blog not found', 404));
    }

    // Handle image upload if provided
    if (req.files && req.files.image && req.files.image[0]) {
      try {
        const file = req.files.image[0];

        // Check file size (max 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
          return next(
            new ApiError(
              `Image file size exceeds maximum allowed size of 10MB`,
              400
            )
          );
        }

        blogData.image = await uploadToCloudinary(file.path, 'blogs/images');
        logger.info(`✅ Blog image updated successfully: ${blogData.image}`);
      } catch (uploadError) {
        logger.error(`❌ Blog image upload failed:`, uploadError);
        return next(
          new ApiError(
            `Failed to upload blog image: ${uploadError.message}`,
            400
          )
        );
      }
    }

    // Derive slug if provided (from body or translations)
    let incomingSlug = blogData.slug;
    if (blogData.slug || blogData.translations?.en?.slug) {
      try {
        incomingSlug = getSlugOrFail(blogData);
        blogData.slug = incomingSlug;
      } catch (slugError) {
        return next(slugError);
      }
    }

    // Validate blog data
    const { error: validationError } = editBlogSchema.validate(blogData);
    if (validationError) {
      return next(new ApiError(validationError.details[0].message, 400));
    }

    // Check if slug is being updated and if it already exists
    if (incomingSlug && incomingSlug !== existingBlog.slug) {
      const slugExists = await Blog.findOne({
        slug: incomingSlug,
        _id: { $ne: id },
      });
      if (slugExists) {
        return next(new ApiError('Blog with this slug already exists', 409));
      }
    }

    let updateData = { ...blogData };
    if (!blogData.translations && (blogData.title || blogData.shortDescription || blogData.detailDescription)) {
      const currentTranslations = existingBlog.translations || {};
      updateData.translations = await processTranslations(blogData, BLOG_FIELD_CONFIG, currentTranslations);
      
      delete updateData.title;
      delete updateData.shortDescription;
      delete updateData.detailDescription;
    }

    // Ensure slug stays unchanged if not provided
    if (!incomingSlug) {
      updateData.slug = existingBlog.slug;
    }

    // Update the blog
    const updatedBlog = await Blog.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    logger.info({
      message: `✅ Blog updated successfully: ${updatedBlog.translations?.en?.title || 'Untitled'}`,
      timestamp: new Date().toISOString(),
    });

    // Invalidate blog caches after edit
    await clearBlogCache();
    return SuccessHandler(updatedBlog, 200, 'Blog updated successfully', res);
  } catch (err) {
    logger.error('❌ Edit blog error:', err);
    next(new ApiError(err.message || 'Internal server error', 500));
  }
};

// Delete blog
export const deleteBlog = async (req, res, next) => {
  try {
    logger.info('🗑️ Delete blog request received');

    const { error } = deleteBlogSchema.validate(req.query);
    if (error) {
      return next(new ApiError(error.details[0].message, 400));
    }

    const { id } = req.query;
    const blog = await Blog.findByIdAndDelete(id);

    if (!blog) {
      return next(new ApiError('Blog not found', 404));
    }

    logger.info({
      message: `✅ Blog deleted successfully: ${blog.translations?.en?.title || 'Untitled'}`,
      timestamp: new Date().toISOString(),
    });

    // Invalidate blog caches after delete
    await clearBlogCache();
    return SuccessHandler(null, 200, 'Blog deleted successfully', res);
  } catch (err) {
    logger.error('❌ Delete blog error:', err);
    next(new ApiError(err.message || 'Internal server error', 500));
  }
};

// Update blog status (publish/unpublish)
export const updateBlogStatus = async (req, res, next) => {
  try {
    logger.info('🔄 Update blog status request received');

    const { id } = req.query;
    const { status } = req.body;

    // Validate blog ID
    const { error: idError } = getBlogByIdSchema.validate({ id });
    if (idError) {
      return next(new ApiError(idError.details[0].message, 400));
    }

    // Validate status
    const { error: statusError } = updateBlogStatusSchema.validate({ status });
    if (statusError) {
      return next(new ApiError(statusError.details[0].message, 400));
    }

    // Check if blog exists
    const existingBlog = await Blog.findById(id);
    if (!existingBlog) {
      return next(new ApiError('Blog not found', 404));
    }

    // Update the blog status
    const updatedBlog = await Blog.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    logger.info({
      message: `✅ Blog status updated to ${status}: ${updatedBlog.translations?.en?.title || 'Untitled'}`,
      timestamp: new Date().toISOString(),
    });

    // Invalidate blog caches after status change
    await clearBlogCache();
    return SuccessHandler(
      updatedBlog,
      200,
      `Blog ${status === 'published' ? 'published' : 'unpublished'} successfully`,
      res
    );
  } catch (err) {
    logger.error('❌ Update blog status error:', err);
    next(new ApiError(err.message || 'Internal server error', 500));
  }
};

export default {
  addBlog,
  getAllBlogs,
  getBlogById,
  getBlogBySlug,
  editBlog,
  deleteBlog,
  updateBlogStatus,
};
