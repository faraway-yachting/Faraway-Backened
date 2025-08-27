// Portal context middleware - identifies which portal is being accessed
import { Request, Response, NextFunction } from 'express';

export const addPortalContext = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const path = req.path;
        
        // Check if the path starts with any portal prefix
        let portal: string | undefined;
        let portalPrefix: string | undefined;
        
        if (path.startsWith('/admin')) {
            portal = 'admin';
            portalPrefix = '/admin';
        } else if (path.startsWith('/website')) {
            portal = 'website';
            portalPrefix = '/website';
        }
        
        if (portal && portalPrefix) {
            // Add portal info to the request so controllers can use it
            req.portal = portal;           // 'admin' or 'website'
            req.portalPrefix = portalPrefix; // '/admin' or '/website'
            
            console.log(`🔍 Portal access: ${portal} - ${req.method} ${req.path}`);
        } else {
            // This is a common route (/v1/*) - no specific portal
            console.log(`🔗 Common route access: ${req.method} ${req.path}`);
        }
        
        next(); // Continue to the next middleware
    } catch {
        // If something goes wrong, just continue without portal context
        next();
    }
};

export default addPortalContext;
