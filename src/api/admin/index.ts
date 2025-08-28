import express from 'express';
import authRoutes from './auth/auth.routes.js';

const router = express.Router();

// 🚀 ADMIN AUTH ROUTES - Mount auth routes at /admin/auth/*
router.use('/auth', authRoutes);

export default router;
