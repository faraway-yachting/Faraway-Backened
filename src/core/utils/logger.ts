import winston from "winston";
import path from "path";

// Import environment configuration
let logLevel = "info";
try {
    // Dynamic import to avoid circular dependency
    const { getEnv } = await import('../../config/environment.js');
    logLevel = getEnv('LOG_LEVEL') || "info";
} catch {
    // Fallback to environment variable if import fails
    logLevel = process.env['LOG_LEVEL'] || "info";
}

// Custom log format for production
const productionFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Custom log format for development
const developmentFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let log = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta)}`;
        }
        return log;
    })
);

const logger = winston.createLogger({
    level: logLevel,
    format: process.env['NODE_ENV'] === 'production' ? productionFormat : developmentFormat,
    defaultMeta: { 
        service: "faraway-backend",
        environment: process.env['NODE_ENV'] || 'development'
    },
    transports: [
        // Console transport
        new winston.transports.Console({
            format: process.env['NODE_ENV'] === 'production' ? productionFormat : developmentFormat,
        }),
        
        // File transport for errors (production)
        ...(process.env['NODE_ENV'] === 'production' ? [
            new winston.transports.File({ 
                filename: path.join("logs", "error.log"), 
                level: "error",
                maxsize: 5242880, // 5MB
                maxFiles: 5,
            }),
            new winston.transports.File({ 
                filename: path.join("logs", "combined.log"),
                maxsize: 5242880, // 5MB
                maxFiles: 5,
            })
        ] : [])
    ],
    
    // Handle uncaught exceptions
    exceptionHandlers: [
        new winston.transports.File({ 
            filename: path.join("logs", "exceptions.log"),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        })
    ],
    
    // Handle unhandled promise rejections
    rejectionHandlers: [
        new winston.transports.File({ 
            filename: path.join("logs", "rejections.log"),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        })
    ]
});

// If we're not in production, log to console as well
if (process.env['NODE_ENV'] !== 'production') {
    logger.add(new winston.transports.Console({
        format: developmentFormat
    }));
}

export default logger;
export { logger };
