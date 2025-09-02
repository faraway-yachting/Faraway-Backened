import express from 'express';
import authRoutes from './auth/auth.routes.js';
import tagRoutes from './tags/tag.routes.js';

const router = express.Router();

// 🚀 ADMIN AUTH ROUTES - Mount auth routes at /admin/auth/*
router.use('/auth', authRoutes);

// 🚀 ADMIN TAG ROUTES - Mount tag routes at /admin/tags/*
router.use('/tags', tagRoutes);

export default router;
