import Yacht from '../models/yacht.js';
import SuccessHandler from '../utils/SuccessHandler.js';
import ApiError from '../utils/ApiError.js';
import mapImageFilenamesToUrls from '../utils/mapImageFilenamesToUrls.js';
import { getYachtByIdSchema, addyachtSchema, editYachtSchema } from '../validations/yacht.validation.js';
import paginate from '../utils/paginate.js';
import { uploadToCloudinary } from '../utils/cloudinaryUtil.js';


// Add a new yacht
export const addYacht = async (req, res, next) => {
  try {
    let yachtData = req.body;

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
          return next(new ApiError(`Primary image file size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size of 10MB`, 400));
        }
        
        console.log(`📸 Uploading primary image: ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        console.log(`📁 File path: ${file.path}`);
        
        // Small delay to ensure file is fully written
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verify file exists before uploading
        const fs = await import('fs/promises');
        try {
          await fs.access(file.path);
          console.log('✅ Primary image file exists and is accessible');
          
          // Get file stats to verify it's not empty
          const stats = await fs.stat(file.path);
          console.log(`📊 File size: ${stats.size} bytes`);
          
          if (stats.size === 0) {
            return next(new ApiError('Primary image file is empty', 400));
          }
        } catch (accessError) {
          console.error('❌ Primary image file does not exist:', file.path);
          console.error('❌ Access error:', accessError.message);
          return next(new ApiError(`Primary image file not found: ${file.path}`, 500));
        }
        
        yachtData.primaryImage = await uploadToCloudinary(file.path, 'Faraway/yachts/primaryImage');
        console.log(`✅ Primary image uploaded successfully: ${yachtData.primaryImage}`);
      } catch (uploadError) {
        console.error(`❌ Primary image upload failed:`, uploadError);
        return next(new ApiError(`Failed to upload primary image: ${uploadError.message}`, 400));
      }
    }

    // Upload galleryImages to Cloudinary
    const galleryImageFiles = [
      ...(req.files?.galleryImages || []),
      ...(req.files?.['galleryImages[]'] || []),
    ];
    
    console.log('🖼️ Gallery images found:', galleryImageFiles.length);
    console.log('📁 Gallery image files:', galleryImageFiles.map(f => ({ path: f.path, fieldname: f.fieldname, originalname: f.originalname })));
    
    if (galleryImageFiles.length > 0) {
      yachtData.galleryImages = [];
              for (const file of galleryImageFiles) {
          try {
            // Check file size (max 10MB)
            const maxSize = 10 * 1024 * 1024; // 10MB in bytes
            if (file.size > maxSize) {
              return next(new ApiError(`Gallery image file size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size of 10MB`, 400));
            }
            
            console.log(`📸 Uploading gallery image: ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
            
            // Check if file exists
            const fs = await import('fs/promises');
            try {
              await fs.access(file.path);
              console.log('✅ Gallery image file exists:', file.path);
            } catch (accessError) {
              console.error('❌ Gallery image file does not exist:', file.path);
              console.error('❌ Access error:', accessError.message);
              return next(new ApiError(`Gallery image file not found: ${file.path}`, 500));
            }
            
            const url = await uploadToCloudinary(file.path, 'Faraway/yachts/galleryImages');
            yachtData.galleryImages.push(url);
            console.log('✅ Gallery image uploaded successfully:', url);
          } catch (uploadError) {
            console.error('❌ Gallery image upload failed:', uploadError);
            return next(new ApiError(`Failed to upload gallery image: ${uploadError.message}`, 400));
          }
        }
    }

    // Now validate yachtData
    const { error } = addyachtSchema.validate(yachtData);
    if (error) {
      return next(new ApiError(error.details[0].message, 400));
    }

    const newYacht = await Yacht.create(yachtData);
    const yachtWithImageUrls = mapImageFilenamesToUrls(newYacht, req);
    return SuccessHandler(yachtWithImageUrls, 201, 'Yacht added successfully', res);
  } catch (err) {
    next(new ApiError(err.message, 400));
  }
};

// Get all yachts
export const getAllYachts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const { skip, limit: parsedLimit } = paginate(page, limit);

    // Build query filter
    const filter = {};
    if (status && ['draft', 'published'].includes(status)) {
      filter.status = status;
    }

    const yachts = await Yacht.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parsedLimit);
    const total = await Yacht.countDocuments(filter);

    const yachtsWithUrls = mapImageFilenamesToUrls(yachts, req);
    return SuccessHandler(
      {
        yachts: yachtsWithUrls,
        page: Number(page),
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit)
      },
      200,
      'Yachts fetched successfully',
      res
    );
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
      // You can use your ApiError class for consistency
      return next(new ApiError(error.details[0].message, 400));
    }

    const { id } = req.query;
    const yacht = await Yacht.findById(id);
    if (!yacht) {
      return next(new ApiError('Yacht not found', 404));
    }
    const yachtWithUrl = mapImageFilenamesToUrls(yacht, req);
    return SuccessHandler(yachtWithUrl, 200, 'Yacht fetched successfully', res);
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
        yachtData.primaryImage = await uploadToCloudinary(file.path, 'Faraway/yachts/primaryImage');
      } catch (uploadError) {
        return next(new ApiError(`Failed to upload primary image: ${uploadError.message}`, 400));
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
          const url = await uploadToCloudinary(file.path, 'Faraway/yachts/galleryImages');
          newGalleryImages.push(url);
        } catch (uploadError) {
          return next(new ApiError(`Failed to upload gallery image: ${uploadError.message}`, 400));
        }
      }
      
      // If new gallery images are provided, replace the existing ones
      yachtData.galleryImages = newGalleryImages;
    }

    // Validate yacht data (make all fields optional for editing)
    const { error: validationError } = editYachtSchema.validate(yachtData);
    if (validationError) {
      return next(new ApiError(validationError.details[0].message, 400));
    }

    // Update the yacht
    const updatedYacht = await Yacht.findByIdAndUpdate(
      id,
      yachtData,
      { new: true, runValidators: true }
    );

    const yachtWithImageUrls = mapImageFilenamesToUrls(updatedYacht, req);
    return SuccessHandler(yachtWithImageUrls, 200, 'Yacht updated successfully', res);
  } catch (err) {
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
      return next(new ApiError('Status must be either "draft" or "published"', 400));
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

    const yachtWithImageUrls = mapImageFilenamesToUrls(updatedYacht, req);
    return SuccessHandler(
      yachtWithImageUrls, 
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
  deleteYacht,
  editYacht,
  updateYachtStatus,
}; 