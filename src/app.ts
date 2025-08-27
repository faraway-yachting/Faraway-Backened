import dotenv from 'dotenv';
dotenv.config({ path: '.env.development' });
import path from 'path';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { requestValidator, errorHandler } from './core/middleware/index.js';
import { rateLimitMiddleware } from './config/rate-limit.js';
import { checkDatabaseHealth } from './config/db.js';
import { cacheService } from './core/utils/services/cache.service.js';
import apiRoutes from './api/index.js';

const app = express();

const startServer = async (): Promise<void> => {
    try {
        // CORS configuration
        app.use(
            cors({
                origin: [
                    'https://faraway-admin-panel.vercel.app',
                    'http://localhost:3000',
                    'https://fa-taupe.vercel.app'
                ],
                credentials: true,
            })
        );

        // Middleware setup
        app.use(cookieParser());
        app.use(express.urlencoded({ extended: true }));
        app.use(express.json());

        // Rate limiting
        app.use('/api', rateLimitMiddleware());

        // Static files
        app.use(
            '/uploads',
            express.static(path.join(process.cwd(), 'uploads'))
        );

        // Request validation middleware
        app.use(requestValidator);

        // Enhanced health check endpoint
        app.get('/health', async (req: Request, res: Response) => {
            try {
                const dbHealth = await checkDatabaseHealth();
                const cacheStats = cacheService.getStats();
                const memoryUsage = process.memoryUsage();
                
                const healthStatus = {
                    status: 'OK',
                    timestamp: new Date().toISOString(),
                    uptime: process.uptime(),
                    environment: process.env['NODE_ENV'] || 'development',
                    version: process.env['npm_package_version'] || '1.0.0',
                    services: {
                        database: dbHealth ? 'healthy' : 'unhealthy',
                        cache: 'healthy',
                        memory: {
                            rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
                            heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
                            heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
                        }
                    },
                    cache: {
                        size: cacheStats.size,
                        keys: cacheStats.keys.length
                    }
                };

                const statusCode = dbHealth ? 200 : 503;
                res.status(statusCode).json(healthStatus);
            } catch (error) {
                res.status(503).json({
                    status: 'ERROR',
                    timestamp: new Date().toISOString(),
                    error: 'Health check failed'
                });
            }
        });

        // API routes
        app.use('/api', apiRoutes);

        // 404 handler
        app.use('*', (req: Request, res: Response) => {
            res.status(404).json({
                success: false,
                message: `Route ${req.originalUrl} not found`
            });
        });

        // Error handling middleware
        app.use(errorHandler);

    } catch (err) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    }
};

startServer();
export default app;
