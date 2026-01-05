import express from 'express';
import { 
  migrateBlogs, 
  migrateYachts, 
  migrateAll, 
  cleanupBlogLegacyFields, 
  cleanupBlogById,
  recreateBlogClean,
  recreateAllBlogsClean,
  validateYachtMigration
} from '../controllers/migrationController.js';
import { verifyToken } from '../middleware/Auth.middleware.js';

const router = express.Router();

// All migration routes require authentication
router.use(verifyToken);

// Migrate blogs
router.post('/blogs', migrateBlogs);

// Migrate yachts
router.post('/yachts', migrateYachts);

// Migrate both blogs and yachts
router.post('/all', migrateAll);

// Validate which yachts need migration (check only, no migration)
router.get('/yachts/validate', validateYachtMigration);

// Cleanup legacy fields from blogs (cleanup-only, no translation)
router.post('/blogs/cleanup', cleanupBlogLegacyFields);

// Cleanup specific blog by ID
router.post('/blogs/cleanup/:id', cleanupBlogById);

// Recreate blog with clean structure (deletes old, creates new without legacy fields)
router.post('/blogs/recreate/:id', recreateBlogClean);

// Recreate all blogs with clean structure
router.post('/blogs/recreate-all', recreateAllBlogsClean);

export default router;

