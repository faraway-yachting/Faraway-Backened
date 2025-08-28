import { Router } from 'express';
import { PORTAL_CONFIG } from '../config/portals.js';
import commonRoutes from './v1/index.js';    // Common routes (shared by all portals)
import adminRoutes from './admin/index.js';  // Admin routes (separate root)

const router = Router();

// 🚀 ADMIN ROUTES - Separate root at /api/admin (completely independent from v1)
router.use('/admin', adminRoutes);

// Common routes (shared by all portals)
router.use('/v1', commonRoutes);

// Portal routes (admin + website) - mount directly here to avoid circular dependency
// For each portal, mount the SAME common routes
Object.entries(PORTAL_CONFIG).forEach(([, portalConfig]) => {
    console.log(`🚀 Mounting ${portalConfig.name} at ${portalConfig.prefix} (using common routes)`);
    
    // Use the SAME common routes for all portals
    router.use(portalConfig.prefix, commonRoutes);
});

export default router;
