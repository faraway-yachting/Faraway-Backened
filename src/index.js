import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import path from 'path';
import app from './app.js';
import connectDB from './config/db.js';
dotenv.config();
// Load environment variables

// Server setup
const PORT = process.env.PORT;
const server = http.createServer(app);

// Increase server timeout for long-running requests (like yacht edits with translations)
// Default is 2 minutes, increase to 25 minutes to handle translation processing
server.timeout = 25 * 60 * 1000; // 25 minutes
// Increase keep-alive timeout to prevent connection closure during long translations
server.keepAliveTimeout = 10 * 60 * 1000; // 10 minutes (prevents connection timeout during translations)
server.headersTimeout = 10 * 60 * 1000 + 1000; // 10 minutes + 1 second buffer
// Enable keep-alive to maintain connections
server.keepAlive = true;

// Serve uploads folder at /uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'src/uploads')));

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Faraway is running on port ${PORT}`);
    console.log(`Server timeout set to ${server.timeout / 1000 / 60} minutes`);
  });
});
