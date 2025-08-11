import express from 'express';
import blogController from '../controllers/blogController.js';
import upload from '../middleware/upload.middleware.js';
import { verifyToken } from '../middleware/Auth.middleware.js';

const router = express.Router();

// Add blog with image upload
router.post('/add-blog', 
  verifyToken,
  upload.fields([
    { name: 'image', maxCount: 1 }
  ]),
  blogController.addBlog
);

// Get all blogs (with optional pagination and status filter)
router.get('/all-blogs', blogController.getAllBlogs);

// Get blog by ID
router.get('/blogByID', blogController.getBlogById);

// Get blog by slug


// Edit blog with optional image upload
router.put('/edit-blog', 
  verifyToken,
  upload.fields([
    { name: 'image', maxCount: 1 }
  ]),
  blogController.editBlog
);

// Delete blog
router.delete('/delete-blog', verifyToken, blogController.deleteBlog);

// Update blog status (publish/unpublish)
router.patch('/update-status', verifyToken, blogController.updateBlogStatus);

export default router;