/**
 * Role-Based Access Control Middleware Factory
 * Usage: authorize("manager", "admin")
 */

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(" or ")}. Your role: ${req.user.role}`,
        code: "INSUFFICIENT_PERMISSIONS",
      });
    }

    next();
  };
};

module.exports = authorize;
