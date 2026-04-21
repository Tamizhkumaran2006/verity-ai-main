/**
 * Winston Logger Configuration
 */

const fs = require("fs");
const { createLogger, format, transports } = require("winston");

// Ensure logs directory exists
const logsDir = require("path").join(__dirname, "../../logs");
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
const path = require("path");

const { combine, timestamp, printf, colorize, errors } = format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

const logger = createLogger({
  level: process.env.NODE_ENV === "production" ? "warn" : "debug",
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }),
    logFormat
  ),
  transports: [
    // Console output
    new transports.Console({
      format: combine(colorize({ all: true }), timestamp({ format: "HH:mm:ss" }), logFormat),
    }),
    // Error log file
    new transports.File({
      filename: path.join(__dirname, "../../logs/error.log"),
      level: "error",
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
    }),
    // Combined log file
    new transports.File({
      filename: path.join(__dirname, "../../logs/combined.log"),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
    }),
  ],
});

module.exports = logger;
