/**
 * Global Error Handler Middleware
 * Catches all unhandled errors and returns consistent JSON responses
 */

const logger = require("../config/logger");

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errors = null;

  // ── Mongoose Validation Error ──────────────────────────
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // ── Mongoose Duplicate Key Error ───────────────────────
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`;
  }

  // ── Mongoose Bad ObjectId ──────────────────────────────
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // ── JWT Errors (shouldn't reach here, but just in case) ─
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token.";
  }

  // ── Log server errors ──────────────────────────────────
  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.path} → ${statusCode}: ${message}`, {
      error: err.stack,
      body: req.body,
      user: req.user?._id,
    });
  }

  const response = {
    success: false,
    message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  };

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
