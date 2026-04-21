/**
 * Verification Routes
 * /api/verify/...
 */

const express = require("express");
const { body } = require("express-validator");
const router = express.Router();

const authenticate = require("../middleware/authenticate");
const {
  verifyDocument,
  getVerificationDetail,
  quickCheck,
} = require("../controllers/verification.controller");

// POST /api/verify — Run verification on stored OR manual data
router.post(
  "/",
  authenticate,
  [
    body("loanType")
      .optional()
      .isIn(["personal", "home", "auto", "business", "education", "other"])
      .withMessage("Invalid loan type"),
  ],
  verifyDocument
);

// POST /api/verify/quick-check — Quick rule check (no DB storage)
router.post(
  "/quick-check",
  authenticate,
  [body("extractedData").notEmpty().withMessage("extractedData is required")],
  quickCheck
);

// GET /api/verify/:id — Get full verification details
router.get("/:id", authenticate, getVerificationDetail);

module.exports = router;
