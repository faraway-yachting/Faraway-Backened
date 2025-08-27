import app from './app.js';
import http from 'http';
import connectDB from './config/db.js';
import environment from './config/environment.js';
import { logger } from './core/utils/logger.js';

// Server setup
const PORT = environment.PORT;
const server = http.createServer(app);

// Database connection and server startup
connectDB().then(() => {
    server.listen(PORT, () => {
        logger.info(`🚀 Faraway server started successfully on port ${PORT} (${environment.NODE_ENV})`);
    });
}).catch((error: unknown) => {
    logger.error('❌ Failed to connect to database:', error);
    process.exit(1);
});
 