import { Router } from 'express';
import authRoutes from './auth/auth.routes.js';
import yachtRoutes from './yachts/yacht.routes.js';
import blogRoutes from './blogs/blog.routes.js';

const router = Router();

// API v1 routes
router.use('/auth', authRoutes);
router.use('/yachts', yachtRoutes);
router.use('/blogs', blogRoutes);

export default router;
