/**
 * History Controller
 * GET /api/history — User-specific application history
 */

const LoanVerification = require("../models/LoanVerification.model");

/**
 * GET /api/history
 * Returns paginated history for the authenticated user (client)
 * Managers can optionally filter by userId
 */
const getHistory = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      loanType,
      userId: queryUserId,
    } = req.query;

    const filter = {};

    // Clients see only their own records
    if (req.user.role === "client") {
      filter.userId = req.user._id;
    } else if (queryUserId) {
      // Managers can filter by a specific user
      filter.userId = queryUserId;
    }

    if (status) filter.status = status;
    if (loanType) filter.loanType = loanType;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [records, totalCount] = await Promise.all([
      LoanVerification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("userId", "name email")
        .select(
          "applicationId loanType status result reason aiDecision.recommendation aiDecision.score files createdAt updatedAt managerAction"
        )
        .lean(),
      LoanVerification.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    return res.status(200).json({
      success: true,
      history: records,
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

/**
 * GET /api/history/:id
 * Get details of a single past application
 */
const getHistoryDetail = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role === "client") query.userId = req.user._id;

    const record = await LoanVerification.findOne(query).populate(
      "userId",
      "name email role photoUrl"
    );

    if (!record) {
      return res.status(404).json({ success: false, message: "Record not found." });
    }

    return res.status(200).json({ success: true, record });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/history/:id
 * Client can cancel/delete their own pending application
 */
const cancelApplication = async (req, res, next) => {
  try {
    const record = await LoanVerification.findOne({
      _id: req.params.id,
      userId: req.user._id,
      status: { $in: ["pending", "ai_reviewed"] },
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Application not found or cannot be cancelled in its current status.",
      });
    }

    record.status = "cancelled";
    record.reason = "Cancelled by applicant.";
    await record.save();

    return res.status(200).json({
      success: true,
      message: "Application cancelled successfully.",
      applicationId: record.applicationId,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getHistory, getHistoryDetail, cancelApplication };
