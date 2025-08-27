// Simple portal configuration - Admin + Website
export interface PortalConfig {
    name: string;
    prefix: string;
    description: string;
}

export const PORTAL_CONFIG: Record<string, PortalConfig> = {
    admin: {
        name: 'Admin Portal',
        prefix: '/admin',
        description: 'Admin management panel'
    },
    website: {
        name: 'Website Portal', 
        prefix: '/website',
        description: 'Public website and customer portal'
    }
};

export default PORTAL_CONFIG;
