/**
 * ============================================================
 * Verity AI - Bank Loan Document Verification System
 * Main Express Server Entry Point
 * ============================================================
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");

const connectDB = require("./src/config/database");
const logger = require("./src/config/logger");

// ── Route Imports ──────────────────────────────────────────
const authRoutes = require("./src/routes/auth.routes");
const uploadRoutes = require("./src/routes/upload.routes");
const verificationRoutes = require("./src/routes/verification.routes");
const managerRoutes = require("./src/routes/manager.routes");
const historyRoutes = require("./src/routes/history.routes");
const healthRoutes = require("./src/routes/health.routes");

// ── Error Handler ──────────────────────────────────────────
const errorHandler = require("./src/middleware/errorHandler");

const app = express();

// ── Security Middleware ────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "same-site" },
  })
);

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:3000",
      "http://localhost:5173",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── Rate Limiting ──────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 mins",
  },
});
app.use("/api/", limiter);

// ── Body Parsing ───────────────────────────────────────────
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// ── Logging ────────────────────────────────────────────────
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
app.use(
  morgan("combined", {
    stream: { write: (msg) => logger.info(msg.trim()) },
    skip: (req) => req.path === "/api/health",
  })
);

// ── Static Files (uploaded documents) ─────────────────────
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
    },
  })
);

// ── API Routes ─────────────────────────────────────────────
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/verify", verificationRoutes);
app.use("/api/manager", managerRoutes);
app.use("/api/history", historyRoutes);

// ── 404 Handler ────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ── Global Error Handler ───────────────────────────────────
app.use(errorHandler);

// ── Start Server ───────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      logger.info(`🚀 Verity AI Backend running on port ${PORT}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      logger.info(`📡 AI Service: ${process.env.PYTHON_AI_SERVICE_URL}`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

// ── Graceful Shutdown ──────────────────────────────────────
process.on("SIGTERM", () => {
  logger.info("SIGTERM received. Shutting down gracefully...");
  process.exit(0);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
});

module.exports = app;
