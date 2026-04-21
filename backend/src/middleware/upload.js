/**
 * Multer File Upload Middleware
 * Handles PDF and image uploads with validation
 */

const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const logger = require("../config/logger");

// ── Ensure upload directory exists ────────────────────────
const uploadDir = path.resolve(process.env.UPLOAD_DIR || "./uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  logger.info(`📁 Upload directory created: ${uploadDir}`);
}

// ── Disk Storage Config ────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Organise files by date: uploads/YYYY-MM/
    const dateFolder = new Date().toISOString().slice(0, 7); // "2024-05"
    const destDir = path.join(uploadDir, dateFolder);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    cb(null, destDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

// ── File Type Filter ───────────────────────────────────────
const ALLOWED_MIMETYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/tiff",
  "image/webp",
];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new multer.MulterError(
        "LIMIT_UNEXPECTED_FILE",
        `Unsupported file type: ${file.mimetype}. Allowed: PDF, JPG, PNG, TIFF`
      ),
      false
    );
  }
};

// ── Max file size ──────────────────────────────────────────
const MAX_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB) || 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

// ── Multer Instance ────────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_SIZE_BYTES,
    files: 5, // max 5 files per request
  },
});

// ── Error Handler Wrapper ──────────────────────────────────
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE: `File too large. Maximum size is ${MAX_SIZE_MB}MB.`,
      LIMIT_FILE_COUNT: "Too many files. Maximum 5 files per upload.",
      LIMIT_UNEXPECTED_FILE: err.message,
    };
    return res.status(400).json({
      success: false,
      message: messages[err.code] || "File upload error.",
      code: err.code,
    });
  }
  next(err);
};

module.exports = { upload, handleMulterError };
