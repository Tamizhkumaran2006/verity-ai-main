/**
 * JWT Authentication Middleware
 * Verifies Bearer token and attaches user to req.user
 */

const jwt = require("jsonwebtoken");
const User = require("../models/User.model");
const logger = require("../config/logger");

const authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Token expired. Please login again.",
          code: "TOKEN_EXPIRED",
        });
      }
      return res.status(401).json({
        success: false,
        message: "Invalid token.",
        code: "TOKEN_INVALID",
      });
    }

    // Fetch user from DB (ensures user still exists and is active)
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found. Token may be stale.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated. Contact support.",
      });
    }

    // Attach user to request
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    logger.error("Authentication middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication failed due to server error.",
    });
  }
};

module.exports = authenticate;
