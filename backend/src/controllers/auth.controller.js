/**
 * Auth Controller
 * Handles Google OAuth login, local register/login, and profile
 */

const User = require("../models/User.model");
const { verifyGoogleToken } = require("../config/firebase");
const { buildTokenResponse } = require("../services/token.service");
const logger = require("../config/logger");

// ── Google OAuth Login ─────────────────────────────────────
/**
 * POST /api/auth/google
 * Body: { idToken: string, role?: "client" | "manager" }
 */
const googleLogin = async (req, res, next) => {
  try {
    const { idToken, role } = req.body;

    if (!idToken) {
      return res.status(400).json({ success: false, message: "Google ID token is required." });
    }

    // Verify with Firebase Admin
    const googleUser = await verifyGoogleToken(idToken);
    const { uid, email, name, picture } = googleUser;

    // Find or create user
    let user = await User.findOne({ $or: [{ googleId: uid }, { email }] });

    if (user) {
      // Update existing user's Google info if needed
      if (!user.googleId) {
        user.googleId = uid;
        user.authProvider = "google";
      }
      user.photoUrl = picture || user.photoUrl;
      user.lastLogin = new Date();
      await user.save();
    } else {
      // First time login - create user
      const assignedRole = ["client", "manager"].includes(role) ? role : "client";
      user = await User.create({
        googleId: uid,
        email,
        name: name || email.split("@")[0],
        photoUrl: picture,
        authProvider: "google",
        role: assignedRole,
        isEmailVerified: true, // Google-verified emails are trusted
        lastLogin: new Date(),
      });
      logger.info(`New user registered via Google OAuth: ${email} [${assignedRole}]`);
    }

    const tokenData = buildTokenResponse(user);

    return res.status(200).json({
      success: true,
      message: "Google authentication successful",
      ...tokenData,
    });
  } catch (error) {
    if (error.message.includes("Firebase")) {
      return res.status(401).json({ success: false, message: "Invalid Google token." });
    }
    next(error);
  }
};

// ── Local Register ─────────────────────────────────────────
/**
 * POST /api/auth/register
 * Body: { name, email, password, role? }
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "Email already registered." });
    }

    const assignedRole = ["client", "manager"].includes(role) ? role : "client";
    const user = await User.create({
      name,
      email,
      password,
      role: assignedRole,
      authProvider: "local",
    });

    logger.info(`New user registered: ${email} [${assignedRole}]`);

    const tokenData = buildTokenResponse(user);
    return res.status(201).json({
      success: true,
      message: "Registration successful",
      ...tokenData,
    });
  } catch (error) {
    next(error);
  }
};

// ── Local Login ────────────────────────────────────────────
/**
 * POST /api/auth/login
 * Body: { email, password }
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email, authProvider: "local" }).select("+password");
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "Account deactivated." });
    }

    user.lastLogin = new Date();
    await user.save();

    const tokenData = buildTokenResponse(user);
    return res.status(200).json({
      success: true,
      message: "Login successful",
      ...tokenData,
    });
  } catch (error) {
    next(error);
  }
};

// ── Get Profile ────────────────────────────────────────────
/**
 * GET /api/auth/me
 */
const getProfile = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
};

// ── Update Profile ─────────────────────────────────────────
/**
 * PATCH /api/auth/me
 */
const updateProfile = async (req, res, next) => {
  try {
    const allowedFields = ["name", "profile"];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => allowedFields.includes(key))
    );

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

module.exports = { googleLogin, register, login, getProfile, updateProfile };
