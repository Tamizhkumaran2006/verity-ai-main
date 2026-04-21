/**
 * Manager Routes
 * /api/manager/... — Protected: manager and admin roles only
 */

const express = require("express");
const { body } = require("express-validator");
const router = express.Router();

const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const {
  getRequests,
  getRequestDetail,
  approveApplication,
  rejectApplication,
  requestMoreInfo,
  getDashboardStats,
  getUsers,
} = require("../controllers/manager.controller");

// Apply auth + role guard to ALL manager routes
router.use(authenticate, authorize("manager", "admin"));

// Dashboard
router.get("/stats", getDashboardStats);

// Application Review
router.get("/requests", getRequests);
router.get("/requests/:id", getRequestDetail);

router.post(
  "/approve",
  [body("verificationId").notEmpty().withMessage("verificationId required")],
  approveApplication
);

router.post(
  "/reject",
  [
    body("verificationId").notEmpty().withMessage("verificationId required"),
    body("reason").notEmpty().withMessage("Rejection reason required"),
  ],
  rejectApplication
);

router.post(
  "/request-more-info",
  [
    body("verificationId").notEmpty().withMessage("verificationId required"),
    body("message").notEmpty().withMessage("Message is required"),
  ],
  requestMoreInfo
);

// User Management (admin only in production, manager allowed here for simplicity)
router.get("/users", getUsers);

module.exports = router;
