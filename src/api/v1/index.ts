import { Router } from 'express';
import yachtRoutes from './yachts/yacht.routes.js';
import blogRoutes from './blogs/blog.routes.js';

const router = Router();

// API v1 routes
router.use('/yachts', yachtRoutes);
router.use('/blogs', blogRoutes);

export default router;
