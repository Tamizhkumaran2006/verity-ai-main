/**
 * Auth Routes
 * /api/auth/...
 */

const express = require("express");
const { body } = require("express-validator");
const router = express.Router();

const {
  googleLogin,
  register,
  login,
  getProfile,
  updateProfile,
} = require("../controllers/auth.controller");
const authenticate = require("../middleware/authenticate");

// ── Validators ─────────────────────────────────────────────
const registerValidator = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
  body("role")
    .optional()
    .isIn(["client", "manager"])
    .withMessage("Role must be client or manager"),
];

const loginValidator = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("password").notEmpty().withMessage("Password is required"),
];

// ── Routes ──────────────────────────────────────────────────
// Google OAuth (Firebase ID token)
router.post("/google", body("idToken").notEmpty().withMessage("ID token required"), googleLogin);

// Local Auth
router.post("/register", registerValidator, register);
router.post("/login", loginValidator, login);

// Protected
router.get("/me", authenticate, getProfile);
router.patch("/me", authenticate, updateProfile);

module.exports = router;
