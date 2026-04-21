/**
 * Upload Controller
 * POST /api/upload
 * Accepts documents, sends to AI for OCR extraction
 */

const path = require("path");
const { v4: uuidv4 } = require("uuid");
const LoanVerification = require("../models/LoanVerification.model");
const { extractDocumentData, getAIDecision } = require("../services/ai.service");
const logger = require("../config/logger");

/**
 * Map MIME type to document category
 */
const getDocumentType = (fieldname, originalname) => {
  const name = (fieldname + originalname).toLowerCase();
  if (name.includes("salary") || name.includes("payslip")) return "salary_slip";
  if (name.includes("bank") || name.includes("statement")) return "bank_statement";
  if (name.includes("itr") || name.includes("tax")) return "income_tax_return";
  if (name.includes("pan")) return "pan_card";
  if (name.includes("aadhaar") || name.includes("aadhar")) return "aadhaar_card";
  if (name.includes("property") || name.includes("deed")) return "property_document";
  if (name.includes("offer") || name.includes("employment")) return "employment_letter";
  return "other";
};

/**
 * POST /api/upload
 * Accepts multiple documents, triggers OCR + AI analysis
 *
 * Multipart fields:
 *   - files: array of documents
 *   - loanType: "personal" | "home" | "auto" | "business" | "education"
 *   - processNow: "true" | "false" (run AI immediately or defer)
 */
const uploadDocuments = async (req, res, next) => {
  const startTime = Date.now();

  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded. Please provide at least one document.",
      });
    }

    const loanType = req.body.loanType || "personal";
    const processNow = req.body.processNow !== "false"; // default: process immediately

    // ── Build file metadata array ──────────────────────────
    const filesMeta = req.files.map((f) => ({
      originalName: f.originalname,
      storedName: f.filename,
      path: f.path,
      mimetype: f.mimetype,
      size: f.size,
      documentType: getDocumentType(f.fieldname, f.originalname),
      url: `/uploads/${path.relative(
        path.resolve(process.env.UPLOAD_DIR || "./uploads"),
        f.path
      ).replace(/\\/g, "/")}`,
    }));

    // ── Generate unique application ID ─────────────────────
    const applicationId = `LOAN-${Date.now()}-${uuidv4().slice(0, 6).toUpperCase()}`;

    // ── Create initial record in DB ────────────────────────
    const verification = await LoanVerification.create({
      userId: req.user._id,
      applicationId,
      files: filesMeta,
      loanType,
      status: processNow ? "processing" : "pending",
      ipAddress: req.ip,
    });

    logger.info(
      `📄 Application ${applicationId} created for user ${req.user.email} — ${req.files.length} file(s)`
    );

    // ── Async AI processing ────────────────────────────────
    if (processNow) {
      // Don't await — process in background, response goes out immediately
      processApplicationAsync(verification._id, filesMeta[0], loanType).catch((err) =>
        logger.error(`Background processing failed for ${applicationId}:`, err.message)
      );
    }

    return res.status(201).json({
      success: true,
      message: processNow
        ? "Documents uploaded. AI processing started in background."
        : "Documents uploaded successfully. Processing is deferred.",
      applicationId,
      verificationId: verification._id,
      filesUploaded: filesMeta.length,
      status: verification.status,
      estimatedProcessingTime: "30-60 seconds",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Background worker: OCR → AI Decision → DB update
 */
const processApplicationAsync = async (verificationId, primaryFile, loanType) => {
  const startTime = Date.now();
  try {
    // 1. OCR Extraction
    const extractResult = await extractDocumentData(
      primaryFile.path,
      primaryFile.mimetype,
      loanType
    );

    const extractedData = extractResult.data?.extracted_data || {};

    // 2. AI Decision
    const decisionResult = await getAIDecision(extractedData, loanType);
    const decision = decisionResult.decision || {};

    // 3. Update DB with results
    const totalTime = Date.now() - startTime;

    await LoanVerification.findByIdAndUpdate(verificationId, {
      extractedData,
      aiDecision: {
        recommendation: decision.recommendation || "manual_review",
        score: decision.score || 0,
        ruleChecks: decision.rule_checks || [],
        mandatoryPassed: decision.mandatory_passed || 0,
        mandatoryTotal: decision.mandatory_total || 0,
        summary: decision.summary || "",
        processedAt: new Date(),
      },
      status: "ai_reviewed",
      result:
        decision.recommendation === "approve"
          ? "Approved"
          : decision.recommendation === "reject"
          ? "Rejected"
          : "Under Review",
      reason: decision.summary,
      ocrProvider: extractResult.data?.provider || "unknown",
      processingTimeMs: totalTime,
    });

    logger.info(
      `✅ Application ${verificationId} processed in ${totalTime}ms → ${decision.recommendation}`
    );
  } catch (error) {
    logger.error(`❌ processApplicationAsync failed for ${verificationId}:`, error.message);
    await LoanVerification.findByIdAndUpdate(verificationId, {
      status: "pending",
      $push: { processingErrors: error.message },
    });
  }
};

/**
 * GET /api/upload/:verificationId
 * Poll the processing status of an application
 */
const getUploadStatus = async (req, res, next) => {
  try {
    const { verificationId } = req.params;
    const query = { _id: verificationId };

    // Clients can only see their own; managers see all
    if (req.user.role === "client") {
      query.userId = req.user._id;
    }

    const record = await LoanVerification.findOne(query).select(
      "applicationId status result aiDecision.recommendation aiDecision.score processingErrors createdAt"
    );

    if (!record) {
      return res.status(404).json({ success: false, message: "Application not found." });
    }

    return res.status(200).json({ success: true, record });
  } catch (error) {
    next(error);
  }
};

module.exports = { uploadDocuments, getUploadStatus };
