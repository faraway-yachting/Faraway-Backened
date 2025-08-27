import winston from "winston";
import path from "path";

// Determine log level
let logLevel: string;
try {
    // Dynamic import avoids circular dependency issues
    const { getEnv } = await import("../../config/environment.js");
    logLevel = getEnv("LOG_LEVEL") || "info";
} catch {
    // Fallback to process.env if config import fails
    logLevel = process.env["LOG_LEVEL"] || "info";
}

// Shared configuration
const isProduction = process.env["NODE_ENV"] === "production";
const logDir = "logs"; // centralized log directory
const maxFileSize = 5 * 1024 * 1024; // 5MB
const maxFiles = 5;

// ----- Log Formats -----
const productionFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }), // capture stack traces
    winston.format.json() // structured logging
);

const developmentFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let log = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta)}`;
        }
        return log;
    })
);

// ----- Transports -----
const transports: winston.transport[] = [
    // Always log to console
    new winston.transports.Console({
        format: isProduction ? productionFormat : developmentFormat,
    }),
];

// Add file transports only in production
if (isProduction) {
    transports.push(
        new winston.transports.File({
            filename: path.join(logDir, "error.log"),
            level: "error",
            maxsize: maxFileSize,
            maxFiles,
        }),
        new winston.transports.File({
            filename: path.join(logDir, "combined.log"),
            maxsize: maxFileSize,
            maxFiles,
        })
    );
}

// ----- Logger Instance -----
const logger = winston.createLogger({
    level: logLevel,
    format: isProduction ? productionFormat : developmentFormat,
    defaultMeta: {
        service: "faraway-backend",
        environment: process.env["NODE_ENV"] || "development",
    },
    transports,
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(logDir, "exceptions.log"),
            maxsize: maxFileSize,
            maxFiles,
        }),
    ],
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(logDir, "rejections.log"),
            maxsize: maxFileSize,
            maxFiles,
        }),
    ],
});

export default logger;
export { logger };
