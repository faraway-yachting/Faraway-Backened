import { checkDatabaseHealth } from '../../../config/db.js';
import environment from '../../../config/environment.js';

export type HealthStatusType = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthStatus {
    status: HealthStatusType;
    timestamp: string;
    uptime: number;
    environment: string;
    version: string;
    responseTime: number;
    services: {
        database: HealthStatusType;
        memory: {
            rss: string;
            heapUsed: string;
            heapTotal: string;
            memoryUsage: number; // Percentage
        };
        system: {
            cpu: number; // CPU usage percentage
            platform: string;
            nodeVersion: string;
        };
    };
    features: {
        emailService: boolean;
        cloudinary: boolean;
    };
    lastCheck: string;
}

export const getHealthStatus = async (): Promise<HealthStatus> => {
    const startTime = Date.now();
    
    try {
        const dbHealth = await checkDatabaseHealth();
        const memoryUsage = process.memoryUsage();
        const responseTime = Date.now() - startTime;

        // Calculate memory usage percentage
        const memoryUsagePercent = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100);

        // Determine overall status
        let overallStatus: HealthStatusType = 'healthy';
        
        if (dbHealth === false) {
            overallStatus = 'unhealthy';
        } else if (memoryUsagePercent > 80) {
            overallStatus = 'degraded';
        }

        return {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            uptime: Math.round(process.uptime()),
            environment: environment.NODE_ENV,
            version: environment.API_VERSION,
            responseTime,
            services: {
                database: dbHealth ? 'healthy' : 'unhealthy',
                memory: {
                    rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
                    heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
                    heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
                    memoryUsage: memoryUsagePercent
                },
                system: {
                    cpu: process.cpuUsage().user / 1000000, // Convert to seconds
                    platform: process.platform,
                    nodeVersion: process.version
                }
            },
            features: {
                emailService: environment.ENABLE_EMAIL_SERVICE,
                cloudinary: environment.CLOUDINARY_ENABLED
            },
            lastCheck: new Date().toISOString()
        };
    } catch {
        // Return unhealthy status if health check fails
        return {
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            uptime: Math.round(process.uptime()),
            environment: environment.NODE_ENV,
            version: environment.API_VERSION,
            responseTime: Date.now() - startTime,
            services: {
                database: 'unhealthy',
                memory: {
                    rss: '0MB',
                    heapUsed: '0MB',
                    heapTotal: '0MB',
                    memoryUsage: 0
                },
                system: {
                    cpu: 0,
                    platform: process.platform,
                    nodeVersion: process.version
                }
            },
            features: {
                emailService: environment.ENABLE_EMAIL_SERVICE,
                cloudinary: environment.CLOUDINARY_ENABLED
            },
            lastCheck: new Date().toISOString()
        };
    }
};
