import { Router } from 'express';
import { 
    createBlog, 
    getAllBlogs, 
    getBlogById, 
    updateBlog, 
    deleteBlog,
    uploadBlogImage
} from './blog.controller.js';
import { 
    validateCreateBlog, 
    validateUpdateBlog 
} from '../../../core/validators/blog.validation.js';
import { authenticateToken } from '../../../core/middleware/Auth.middleware.js';
import { upload } from '../../../core/middleware/upload.middleware.js';

const router = Router();

// Public routes
router.get('/', getAllBlogs);
router.get('/:id', getBlogById);

// Protected routes
router.post('/', authenticateToken, validateCreateBlog, createBlog);
router.put('/:id', authenticateToken, validateUpdateBlog, updateBlog);
router.delete('/:id', authenticateToken, deleteBlog);
router.post('/:id/image', authenticateToken, upload.single('image'), uploadBlogImage);

export default router;
