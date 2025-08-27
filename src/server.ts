import app from './app.js';
import http from 'http';
import { connectDB, environmentConfig } from './config/index.js';

// Load environment variables first
environmentConfig();

// Server setup
const PORT = process.env['PORT'] || 8100;
const server = http.createServer(app);

connectDB().then(() => {
    server.listen(PORT, () => {
        console.log(`Faraway is running on port ${PORT}`);
    });
}).catch((error) => {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
});
