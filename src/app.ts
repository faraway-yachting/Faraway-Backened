import dotenv from 'dotenv';
dotenv.config({ path: '.env.development' });
import path from 'path';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { requestValidator } from './core/middleware/index.js';
import { ApiErrorMiddleware } from './core/middleware/index.js';
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

        // Static files
        app.use(
            '/uploads',
            express.static(path.join(process.cwd(), 'uploads'))
        );

        // Request validation middleware
        app.use(requestValidator);

        // Health check endpoint
        app.get('/health', (req: Request, res: Response) => {
            res.json({
                message: 'OK',
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            });
        });

        // API routes
        app.use('/api', apiRoutes);

        // Error handling middleware
        app.use(ApiErrorMiddleware);

    } catch (err) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    }
};

startServer();
export default app;
