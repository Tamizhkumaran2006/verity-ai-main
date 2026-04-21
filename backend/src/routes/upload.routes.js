/**
 * Upload Routes
 * /api/upload/...
 */

const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authenticate");
const { upload, handleMulterError } = require("../middleware/upload");
const { uploadDocuments, getUploadStatus } = require("../controllers/upload.controller");

// POST /api/upload — Upload one or more documents
router.post(
  "/",
  authenticate,
  upload.array("files", 5), // Accept up to 5 files under "files" field
  handleMulterError,
  uploadDocuments
);

// GET /api/upload/:verificationId — Poll processing status
router.get("/:verificationId", authenticate, getUploadStatus);

module.exports = router;
