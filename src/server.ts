import dotenv from 'dotenv';
dotenv.config({ path: '.env.development' });
import app from './app.js';
import http from 'http';
import { connectDB, environmentConfig } from './config/index.js';
import { logger } from './core/utils/logger.js';

// Load and validate environment variables
environmentConfig();

// Server setup
const PORT = process.env['PORT'] || 3000;
const server = http.createServer(app);

// Connect to database
connectDB().then(() => {
    server.listen(PORT, () => {
        logger.info(`🚀 Faraway server is running on port ${PORT}`);
        logger.info(`📊 Health check: http://localhost:${PORT}/health`);
        logger.info(`🔗 API base: http://localhost:${PORT}/api/v1`);
    });
}).catch((error) => {
    logger.error('❌ Failed to connect to database:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
    });
});
