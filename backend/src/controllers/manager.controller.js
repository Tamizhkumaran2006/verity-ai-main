/**
 * Manager Controller
 * Manager/Admin facing APIs for reviewing loan applications
 */

const LoanVerification = require("../models/LoanVerification.model");
const User = require("../models/User.model");
const logger = require("../config/logger");

// ── GET /api/manager/requests ──────────────────────────────
/**
 * List all pending/ai_reviewed applications for manager review
 * Supports filtering, sorting, pagination
 */
const getRequests = async (req, res, next) => {
  try {
    const {
      status,
      loanType,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      order = "desc",
      search,
    } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    else filter.status = { $in: ["pending", "processing", "ai_reviewed"] };
    if (loanType) filter.loanType = loanType;

    // Text search on applicationId
    if (search) {
      filter.$or = [
        { applicationId: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === "asc" ? 1 : -1;

    const [records, totalCount] = await Promise.all([
      LoanVerification.find(filter)
        .populate("userId", "name email role photoUrl")
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      LoanVerification.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    return res.status(200).json({
      success: true,
      records,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        limit: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/manager/requests/:id ──────────────────────────
/**
 * Get full details of a specific application (for manager review screen)
 */
const getRequestDetail = async (req, res, next) => {
  try {
    const record = await LoanVerification.findById(req.params.id).populate(
      "userId",
      "name email role photoUrl profile"
    );

    if (!record) {
      return res.status(404).json({ success: false, message: "Application not found." });
    }

    return res.status(200).json({ success: true, record });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/manager/approve ──────────────────────────────
/**
 * Manager approves a loan application
 * Body: { verificationId, comment? }
 */
const approveApplication = async (req, res, next) => {
  try {
    const { verificationId, comment } = req.body;

    if (!verificationId) {
      return res.status(400).json({ success: false, message: "verificationId is required." });
    }

    const record = await LoanVerification.findById(verificationId);
    if (!record) {
      return res.status(404).json({ success: false, message: "Application not found." });
    }

    if (!["pending", "ai_reviewed", "more_info_needed"].includes(record.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot approve application in status: ${record.status}`,
      });
    }

    record.status = "approved";
    record.result = "Approved";
    record.reason = comment || "Approved by manager after review.";
    record.managerAction = {
      managerId: req.user._id,
      managerName: req.user.name,
      action: "approved",
      comment: comment || "",
      actionAt: new Date(),
    };
    await record.save();

    logger.info(
      `✅ Application ${record.applicationId} APPROVED by ${req.user.email}`
    );

    return res.status(200).json({
      success: true,
      message: "Application approved successfully.",
      applicationId: record.applicationId,
      status: record.status,
      result: record.result,
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/manager/reject ───────────────────────────────
/**
 * Manager rejects a loan application
 * Body: { verificationId, reason }
 */
const rejectApplication = async (req, res, next) => {
  try {
    const { verificationId, reason } = req.body;

    if (!verificationId) {
      return res.status(400).json({ success: false, message: "verificationId is required." });
    }

    if (!reason) {
      return res.status(400).json({ success: false, message: "Rejection reason is required." });
    }

    const record = await LoanVerification.findById(verificationId);
    if (!record) {
      return res.status(404).json({ success: false, message: "Application not found." });
    }

    if (!["pending", "ai_reviewed", "more_info_needed"].includes(record.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot reject application in status: ${record.status}`,
      });
    }

    record.status = "rejected";
    record.result = "Rejected";
    record.reason = reason;
    record.managerAction = {
      managerId: req.user._id,
      managerName: req.user.name,
      action: "rejected",
      comment: reason,
      actionAt: new Date(),
    };
    await record.save();

    logger.info(
      `❌ Application ${record.applicationId} REJECTED by ${req.user.email} — Reason: ${reason}`
    );

    return res.status(200).json({
      success: true,
      message: "Application rejected.",
      applicationId: record.applicationId,
      status: record.status,
      reason,
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/manager/request-more-info ───────────────────
/**
 * Manager requests additional documents from applicant
 * Body: { verificationId, message }
 */
const requestMoreInfo = async (req, res, next) => {
  try {
    const { verificationId, message } = req.body;

    if (!verificationId || !message) {
      return res.status(400).json({
        success: false,
        message: "verificationId and message are required.",
      });
    }

    const record = await LoanVerification.findByIdAndUpdate(
      verificationId,
      {
        status: "more_info_needed",
        managerAction: {
          managerId: req.user._id,
          managerName: req.user.name,
          action: "more_info_requested",
          comment: message,
          actionAt: new Date(),
        },
      },
      { new: true }
    );

    if (!record) {
      return res.status(404).json({ success: false, message: "Application not found." });
    }

    return res.status(200).json({
      success: true,
      message: "More information requested from applicant.",
      applicationId: record.applicationId,
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/manager/stats ─────────────────────────────────
/**
 * Dashboard summary statistics for managers
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const [statusStats, loanTypeStats, recentActivity] = await Promise.all([
      // Count by status
      LoanVerification.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      // Count by loan type
      LoanVerification.aggregate([
        { $group: { _id: "$loanType", count: { $sum: 1 } } },
      ]),

      // 5 most recent applications
      LoanVerification.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("userId", "name email")
        .select("applicationId loanType status result aiDecision.score createdAt"),
    ]);

    // Reshape status stats
    const stats = {};
    for (const s of statusStats) stats[s._id] = s.count;

    const totalApplications = await LoanVerification.countDocuments();
    const approvalRate =
      totalApplications > 0
        ? (((stats.approved || 0) / totalApplications) * 100).toFixed(1)
        : 0;

    return res.status(200).json({
      success: true,
      stats: {
        totalApplications,
        pending: stats.pending || 0,
        processing: stats.processing || 0,
        aiReviewed: stats.ai_reviewed || 0,
        approved: stats.approved || 0,
        rejected: stats.rejected || 0,
        moreInfoNeeded: stats.more_info_needed || 0,
        approvalRate: `${approvalRate}%`,
      },
      byLoanType: loanTypeStats.map((l) => ({ type: l._id, count: l.count })),
      recentActivity,
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/manager/users ─────────────────────────────────
/**
 * List all registered users (admin/manager view)
 */
const getUsers = async (req, res, next) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role) filter.role = role;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      users,
      pagination: { currentPage: parseInt(page), total, limit: parseInt(limit) },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRequests,
  getRequestDetail,
  approveApplication,
  rejectApplication,
  requestMoreInfo,
  getDashboardStats,
  getUsers,
};
