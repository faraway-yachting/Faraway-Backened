import dotenv from 'dotenv';
dotenv.config();
import path from 'path'; // add this at the top if not already

import express from 'express';
import cors from 'cors';


import ApiErrorMiddleware from './middleware/ApiError.middleware.js';
const app = express();
import requestValidator from './middleware/requestValidator.middleware.js';
import router from './router/index.js';
import cookieParser from 'cookie-parser';


const startServer = async () => {
    try {
        app.use(
            cors(
                {
                    origin: [
                      'https://faraway-admin-panel.vercel.app',
                      'http://localhost:3000',
                      'https://fa-taupe.vercel.app'
                    ],
                    credentials: true,
                  }
            )
        );
        app.use(cookieParser());
        app.use(express.urlencoded({ extended: true }));
        app.use(express.json());
        app.use(
            '/uploads',
            express.static(path.join(process.cwd(), 'src', 'uploads'))
        );
        // ✅ Middleware setup

        app.use(requestValidator);

        app.get('/health', (req, res) => {
            res.json({
                message: 'OK',
            });
        });

        app.use('/', router);
        app.use(ApiErrorMiddleware);
    } catch (err) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    }
};

startServer();
export default app;
