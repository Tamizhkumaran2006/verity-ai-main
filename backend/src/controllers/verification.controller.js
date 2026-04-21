/**
 * Verification Controller
 * POST /api/verify — Run rule-based verification on extracted data
 * GET  /api/verify/:id — Get full verification details
 */

const LoanVerification = require("../models/LoanVerification.model");
const { getAIDecision } = require("../services/ai.service");
const logger = require("../config/logger");

// ══════════════════════════════════════════════════════════
// RULE ENGINE — Bank Loan Verification Rules
// Each rule is a function: (extractedData) => { passed, actual, expected, description }
// ══════════════════════════════════════════════════════════

const LOAN_RULES = {
  // ── Personal Loan Rules ─────────────────────────────────
  personal: {
    mandatory: [
      {
        rule: "creditScore >= 650",
        description: "Minimum credit score of 650 required",
        weight: 3,
        check: (d) => ({
          passed: d.creditScore != null && d.creditScore >= 650,
          actualValue: d.creditScore,
          expectedValue: "≥ 650",
        }),
      },
      {
        rule: "monthlyIncome >= 25000",
        description: "Minimum monthly income ₹25,000",
        weight: 3,
        check: (d) => ({
          passed: d.monthlyIncome != null && d.monthlyIncome >= 25000,
          actualValue: d.monthlyIncome,
          expectedValue: "≥ ₹25,000",
        }),
      },
      {
        rule: "age >= 21 && age <= 60",
        description: "Applicant age must be between 21 and 60 years",
        weight: 2,
        check: (d) => ({
          passed: d.age != null && d.age >= 21 && d.age <= 60,
          actualValue: d.age,
          expectedValue: "21–60",
        }),
      },
      {
        rule: "debtToIncomeRatio <= 0.50",
        description: "Debt-to-income ratio must not exceed 50%",
        weight: 2,
        check: (d) => ({
          passed: d.debtToIncomeRatio == null || d.debtToIncomeRatio <= 0.5,
          actualValue: d.debtToIncomeRatio != null ? `${(d.debtToIncomeRatio * 100).toFixed(1)}%` : null,
          expectedValue: "≤ 50%",
        }),
      },
      {
        rule: "workExperienceYears >= 1",
        description: "Minimum 1 year of employment/work experience",
        weight: 1,
        check: (d) => ({
          passed: d.workExperienceYears != null && d.workExperienceYears >= 1,
          actualValue: d.workExperienceYears,
          expectedValue: "≥ 1 year",
        }),
      },
    ],
    preferred: [
      {
        rule: "creditScore >= 750",
        description: "Excellent credit score (≥ 750) for better interest rates",
        weight: 2,
        check: (d) => ({
          passed: d.creditScore != null && d.creditScore >= 750,
          actualValue: d.creditScore,
          expectedValue: "≥ 750",
        }),
      },
      {
        rule: "bouncedCheques === 0",
        description: "No bounced cheques in last 12 months",
        weight: 1,
        check: (d) => ({
          passed: d.bouncedCheques == null || d.bouncedCheques === 0,
          actualValue: d.bouncedCheques,
          expectedValue: "0",
        }),
      },
    ],
  },

  // ── Home Loan Rules ─────────────────────────────────────
  home: {
    mandatory: [
      {
        rule: "creditScore >= 700",
        description: "Minimum credit score of 700 for home loans",
        weight: 3,
        check: (d) => ({
          passed: d.creditScore != null && d.creditScore >= 700,
          actualValue: d.creditScore,
          expectedValue: "≥ 700",
        }),
      },
      {
        rule: "annualIncome >= 360000",
        description: "Minimum annual income ₹3.6L for home loan",
        weight: 3,
        check: (d) => ({
          passed: d.annualIncome != null && d.annualIncome >= 360000,
          actualValue: d.annualIncome,
          expectedValue: "≥ ₹3,60,000",
        }),
      },
      {
        rule: "ltvRatio <= 0.80",
        description: "Loan-to-Value ratio must not exceed 80%",
        weight: 3,
        check: (d) => ({
          passed: d.ltvRatio == null || d.ltvRatio <= 0.8,
          actualValue: d.ltvRatio != null ? `${(d.ltvRatio * 100).toFixed(1)}%` : null,
          expectedValue: "≤ 80%",
        }),
      },
      {
        rule: "workExperienceYears >= 2",
        description: "Minimum 2 years of stable employment",
        weight: 2,
        check: (d) => ({
          passed: d.workExperienceYears != null && d.workExperienceYears >= 2,
          actualValue: d.workExperienceYears,
          expectedValue: "≥ 2 years",
        }),
      },
      {
        rule: "age >= 21 && age <= 65",
        description: "Applicant age must be between 21 and 65 years",
        weight: 1,
        check: (d) => ({
          passed: d.age != null && d.age >= 21 && d.age <= 65,
          actualValue: d.age,
          expectedValue: "21–65",
        }),
      },
    ],
    preferred: [
      {
        rule: "debtToIncomeRatio <= 0.40",
        description: "Preferred DTI ratio ≤ 40% for favourable terms",
        weight: 2,
        check: (d) => ({
          passed: d.debtToIncomeRatio != null && d.debtToIncomeRatio <= 0.4,
          actualValue: d.debtToIncomeRatio,
          expectedValue: "≤ 40%",
        }),
      },
    ],
  },

  // ── Business Loan Rules ─────────────────────────────────
  business: {
    mandatory: [
      {
        rule: "creditScore >= 680",
        description: "Minimum credit score of 680 for business loans",
        weight: 3,
        check: (d) => ({
          passed: d.creditScore != null && d.creditScore >= 680,
          actualValue: d.creditScore,
          expectedValue: "≥ 680",
        }),
      },
      {
        rule: "annualIncome >= 600000",
        description: "Minimum business annual revenue ₹6L",
        weight: 3,
        check: (d) => ({
          passed: d.annualIncome != null && d.annualIncome >= 600000,
          actualValue: d.annualIncome,
          expectedValue: "≥ ₹6,00,000",
        }),
      },
      {
        rule: "workExperienceYears >= 2",
        description: "Business must be operational for ≥ 2 years",
        weight: 2,
        check: (d) => ({
          passed: d.workExperienceYears != null && d.workExperienceYears >= 2,
          actualValue: d.workExperienceYears,
          expectedValue: "≥ 2 years",
        }),
      },
      {
        rule: "averageMonthlyBalance >= 10000",
        description: "Average monthly bank balance ≥ ₹10,000",
        weight: 2,
        check: (d) => ({
          passed: d.averageMonthlyBalance != null && d.averageMonthlyBalance >= 10000,
          actualValue: d.averageMonthlyBalance,
          expectedValue: "≥ ₹10,000",
        }),
      },
    ],
    preferred: [],
  },
};

// Fallback rules for unlisted loan types
const DEFAULT_RULES = LOAN_RULES.personal;

// ══════════════════════════════════════════════════════════
// RULE ENGINE RUNNER
// ══════════════════════════════════════════════════════════

/**
 * Run the rule engine locally (no AI service needed)
 * @param {Object} extractedData
 * @param {string} loanType
 * @returns {Object} Full decision result
 */
const runRuleEngine = (extractedData, loanType) => {
  const rules = LOAN_RULES[loanType] || DEFAULT_RULES;
  const allChecks = [];
  let mandatoryPassed = 0;
  let mandatoryTotal = 0;
  let weightedScore = 0;
  let totalWeight = 0;

  const runCategory = (ruleList, category) => {
    for (const ruleDef of ruleList) {
      const result = ruleDef.check(extractedData);
      allChecks.push({
        rule: ruleDef.rule,
        description: ruleDef.description,
        passed: result.passed,
        actualValue: result.actualValue ?? "Not found",
        expectedValue: result.expectedValue,
        weight: ruleDef.weight,
        category,
      });

      if (category === "mandatory") {
        mandatoryTotal++;
        if (result.passed) mandatoryPassed++;
      }

      if (result.passed) weightedScore += ruleDef.weight;
      totalWeight += ruleDef.weight;
    }
  };

  if (rules.mandatory) runCategory(rules.mandatory, "mandatory");
  if (rules.preferred) runCategory(rules.preferred, "preferred");

  const allMandatoryPassed = mandatoryPassed === mandatoryTotal;
  const approvalScore = totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 0;

  // Determine recommendation
  let recommendation;
  if (!allMandatoryPassed) {
    recommendation = "reject";
  } else if (approvalScore >= 80) {
    recommendation = "approve";
  } else {
    recommendation = "manual_review";
  }

  // Build human-readable summary
  const failedMandatory = allChecks.filter((c) => c.category === "mandatory" && !c.passed);
  const passedCount = allChecks.filter((c) => c.passed).length;

  let summary;
  if (recommendation === "approve") {
    summary = `All ${mandatoryTotal} mandatory criteria passed. Approval score: ${approvalScore}/100.`;
  } else if (recommendation === "reject") {
    const reasons = failedMandatory.map((c) => c.description).join("; ");
    summary = `Rejected — ${failedMandatory.length} mandatory criteria failed: ${reasons}`;
  } else {
    summary = `Mandatory criteria passed but score ${approvalScore}/100 requires manual review.`;
  }

  return {
    recommendation,
    score: approvalScore,
    ruleChecks: allChecks,
    mandatoryPassed,
    mandatoryTotal,
    preferredPassed: allChecks.filter((c) => c.category === "preferred" && c.passed).length,
    summary,
  };
};

// ══════════════════════════════════════════════════════════
// CONTROLLERS
// ══════════════════════════════════════════════════════════

/**
 * POST /api/verify
 * Run verification on an application (by verificationId)
 * Also accepts manual extractedData for quick checks
 *
 * Body: { verificationId?, extractedData?, loanType?, useAI? }
 */
const verifyDocument = async (req, res, next) => {
  try {
    const { verificationId, extractedData: manualData, loanType = "personal", useAI = false } = req.body;

    let record = null;
    let dataToVerify = manualData;

    // ── Option A: Verify a stored application ─────────────
    if (verificationId) {
      const query = { _id: verificationId };
      if (req.user.role === "client") query.userId = req.user._id;

      record = await LoanVerification.findOne(query);
      if (!record) {
        return res.status(404).json({ success: false, message: "Application not found." });
      }

      dataToVerify = record.extractedData;

      if (!dataToVerify || Object.keys(dataToVerify).length === 0) {
        return res.status(400).json({
          success: false,
          message: "No extracted data found. Please upload and process a document first.",
        });
      }
    }

    if (!dataToVerify) {
      return res.status(400).json({
        success: false,
        message: "Provide either verificationId or extractedData in request body.",
      });
    }

    // ── Run Decision Logic ─────────────────────────────────
    let decisionResult;

    if (useAI) {
      // Use Python AI service for enhanced decision
      try {
        const aiResult = await getAIDecision(dataToVerify, loanType);
        decisionResult = aiResult.decision;
      } catch (aiErr) {
        logger.warn(`AI service unavailable, falling back to rule engine: ${aiErr.message}`);
        decisionResult = runRuleEngine(dataToVerify, loanType);
      }
    } else {
      // Local rule engine (fast, no external dependency)
      decisionResult = runRuleEngine(dataToVerify, loanType);
    }

    // ── Update DB if we have a record ─────────────────────
    if (record) {
      const newStatus = decisionResult.recommendation === "approve"
        ? "ai_reviewed"
        : decisionResult.recommendation === "reject"
        ? "ai_reviewed"
        : "ai_reviewed";

      await LoanVerification.findByIdAndUpdate(record._id, {
        "aiDecision.recommendation": decisionResult.recommendation,
        "aiDecision.score": decisionResult.score,
        "aiDecision.ruleChecks": decisionResult.ruleChecks,
        "aiDecision.mandatoryPassed": decisionResult.mandatoryPassed,
        "aiDecision.mandatoryTotal": decisionResult.mandatoryTotal,
        "aiDecision.summary": decisionResult.summary,
        "aiDecision.processedAt": new Date(),
        status: newStatus,
        result:
          decisionResult.recommendation === "approve"
            ? "Approved"
            : decisionResult.recommendation === "reject"
            ? "Rejected"
            : "Under Review",
        reason: decisionResult.summary,
      });
    }

    // ── Build Response ─────────────────────────────────────
    const statusMap = {
      approve: "Eligible for Approval",
      reject: "Not Eligible",
      manual_review: "Requires Manual Review",
    };

    return res.status(200).json({
      success: true,
      verificationId: record?._id || null,
      applicationId: record?.applicationId || null,
      loanType,
      status: statusMap[decisionResult.recommendation] || "Unknown",
      recommendation: decisionResult.recommendation,
      approvalScore: decisionResult.score,
      summary: decisionResult.summary,
      ruleChecks: decisionResult.ruleChecks,
      mandatoryPassed: decisionResult.mandatoryPassed,
      mandatoryTotal: decisionResult.mandatoryTotal,
      decisionEngine: useAI ? "ai_service" : "rule_engine",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/verify/:id
 * Get full verification record with all details
 */
const getVerificationDetail = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role === "client") query.userId = req.user._id;

    const record = await LoanVerification.findOne(query).populate(
      "userId",
      "name email role photoUrl"
    );

    if (!record) {
      return res.status(404).json({ success: false, message: "Verification record not found." });
    }

    return res.status(200).json({ success: true, record });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/verify/quick-check
 * Instant rule check without DB storage (for demos / testing)
 * Body: { extractedData, loanType }
 */
const quickCheck = async (req, res, next) => {
  try {
    const { extractedData, loanType = "personal" } = req.body;

    if (!extractedData) {
      return res.status(400).json({ success: false, message: "extractedData is required." });
    }

    const result = runRuleEngine(extractedData, loanType);

    return res.status(200).json({
      success: true,
      message: "Quick verification complete",
      loanType,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { verifyDocument, getVerificationDetail, quickCheck };
