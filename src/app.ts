import express, { type Request, type Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { requestValidator, errorHandler, addPortalContext } from './core/middleware/index.js';
import { rateLimitMiddleware } from './config/rate-limit.js';
import { getHealthStatus } from './core/utils/helpers/health.js';
import apiRoutes from './api/index.js';
import environment from './config/environment.js';

const app = express();

// CORS configuration
app.use(
    cors({
        origin: [
            environment.FRONTEND_URL,
            'https://faraway-admin-panel.vercel.app',
            'https://fa-taupe.vercel.app'
        ],
        credentials: true,
    })
);

// Middleware setup
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Rate limiting (always enabled for security)
app.use('/api', rateLimitMiddleware());

// Request validation middleware
app.use(requestValidator);

// Portal context middleware (adds portal info to requests)
app.use('/api', addPortalContext);

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
    const healthStatus = await getHealthStatus();
    const statusCode = healthStatus.status === 'unhealthy' ? 503 : 200;
    res.status(statusCode).json(healthStatus);
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

export default app;
