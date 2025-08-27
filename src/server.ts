import app from './app.js';
import http from 'http';
import connectDB from './config/db.js';
import environment from './config/environment.js';

// Server setup
const PORT = environment.PORT;
console.log(`🌍 Environment: PORT ${PORT}`);
const server = http.createServer(app);

// Database connection and server startup
connectDB().then(() => {
    server.listen(PORT, () => {
        console.log(`Faraway is running on port ${PORT}`);
        console.log(`🌍 Environment: ${environment.NODE_ENV}`);
        console.log(`📡 API Version: ${environment.API_VERSION}`);
    });
}).catch((error: unknown) => {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
});
 