declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                name: string;
                email: string;
                role?: string;
            };
            portal?: string;        // Portal name (admin, website)
            portalPrefix?: string;  // Portal URL prefix (/admin, /website)
        }
        
        interface Response {
            clearCookie(name: string, options?: any): Response;
        }
    }
}

export {};
