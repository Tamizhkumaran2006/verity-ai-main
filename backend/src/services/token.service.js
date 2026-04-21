/**
 * Token Service
 * JWT generation and refresh logic
 */

const jwt = require("jsonwebtoken");

/**
 * Generate a signed JWT access token
 * @param {Object} payload - { userId, email, role }
 * @returns {string} JWT token
 */
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    issuer: "verity-ai",
    audience: "verity-ai-client",
  });
};

/**
 * Generate a short-lived refresh token (optional)
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "30d",
    issuer: "verity-ai",
    audience: "verity-ai-client",
  });
};

/**
 * Build standard token response object
 */
const buildTokenResponse = (user) => {
  const payload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  };

  const token = generateToken(payload);

  return {
    token,
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      photoUrl: user.photoUrl,
      isEmailVerified: user.isEmailVerified,
    },
  };
};

module.exports = { generateToken, generateRefreshToken, buildTokenResponse };
