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

// Serve uploads folder at /uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'src/uploads')));

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Faraway is running on port ${PORT}`);
  });
});
