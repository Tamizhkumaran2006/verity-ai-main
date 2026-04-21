/**
 * LoanVerification Model
 * Core model tracking document submissions through the full lifecycle
 */

const mongoose = require("mongoose");

// ── Sub-schema: Extracted Document Data ───────────────────
const extractedDataSchema = new mongoose.Schema(
  {
    // Applicant Personal Info
    applicantName: { type: String, default: null },
    dateOfBirth: { type: String, default: null },
    age: { type: Number, default: null },
    panNumber: { type: String, default: null },
    aadhaarNumber: { type: String, default: null },

    // Financial Info
    monthlyIncome: { type: Number, default: null },
    annualIncome: { type: Number, default: null },
    employmentType: { type: String, default: null }, // salaried / self-employed / business
    employerName: { type: String, default: null },
    workExperienceYears: { type: Number, default: null },

    // Loan Request
    loanAmount: { type: Number, default: null },
    loanPurpose: { type: String, default: null },
    loanTenureMonths: { type: Number, default: null },

    // Credit Profile
    creditScore: { type: Number, default: null },
    existingLoanEMI: { type: Number, default: null },
    debtToIncomeRatio: { type: Number, default: null },

    // Bank Statement Info
    averageMonthlyBalance: { type: Number, default: null },
    bouncedCheques: { type: Number, default: null },

    // Property (for home loans)
    propertyValue: { type: Number, default: null },
    ltvRatio: { type: Number, default: null }, // Loan to Value ratio

    // Raw OCR text (for debugging / AI re-processing)
    rawText: { type: String, default: null },

    // Confidence score from OCR/AI
    extractionConfidence: { type: Number, min: 0, max: 1, default: null },

    // Any extra key-value pairs AI found
    additionalFields: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { _id: false }
);

// ── Sub-schema: Individual Rule Check ─────────────────────
const ruleCheckSchema = new mongoose.Schema(
  {
    rule: { type: String, required: true },      // e.g. "creditScore >= 650"
    description: { type: String, required: true }, // human-readable label
    passed: { type: Boolean, required: true },
    actualValue: { type: mongoose.Schema.Types.Mixed },
    expectedValue: { type: mongoose.Schema.Types.Mixed },
    weight: { type: Number, default: 1 },         // importance weight
    category: {
      type: String,
      enum: ["mandatory", "preferred", "bonus"],
      default: "mandatory",
    },
  },
  { _id: false }
);

// ── Sub-schema: File Attachment ────────────────────────────
const fileSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    path: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true }, // bytes
    documentType: {
      type: String,
      enum: [
        "salary_slip",
        "bank_statement",
        "income_tax_return",
        "pan_card",
        "aadhaar_card",
        "property_document",
        "employment_letter",
        "other",
      ],
      default: "other",
    },
    url: { type: String, default: null }, // public URL if stored on cloud
  },
  { _id: false }
);

// ── Sub-schema: Manager Action ─────────────────────────────
const managerActionSchema = new mongoose.Schema(
  {
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    managerName: { type: String },
    action: { type: String, enum: ["approved", "rejected", "more_info_requested"] },
    comment: { type: String, maxlength: 1000 },
    actionAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ── Main LoanVerification Schema ───────────────────────────
const loanVerificationSchema = new mongoose.Schema(
  {
    // ── References ──────────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    applicationId: {
      type: String,
      unique: true,
      required: true,
    },

    // ── Documents ────────────────────────────────────────
    files: [fileSchema],

    // ── AI Extracted Data ────────────────────────────────
    extractedData: {
      type: extractedDataSchema,
      default: {},
    },

    // ── AI Decision ──────────────────────────────────────
    aiDecision: {
      recommendation: {
        type: String,
        enum: ["approve", "reject", "manual_review"],
        default: null,
      },
      score: { type: Number, min: 0, max: 100, default: null }, // 0-100 approval score
      ruleChecks: [ruleCheckSchema],
      mandatoryPassed: { type: Number, default: 0 },
      mandatoryTotal: { type: Number, default: 0 },
      summary: { type: String, default: null },
      processedAt: { type: Date, default: null },
    },

    // ── Final Status ─────────────────────────────────────
    status: {
      type: String,
      enum: [
        "pending",          // Uploaded, not yet processed
        "processing",       // OCR running
        "ai_reviewed",      // AI has made recommendation
        "approved",         // Manager approved
        "rejected",         // Manager rejected
        "more_info_needed", // More documents requested
        "cancelled",        // Client cancelled
      ],
      default: "pending",
      index: true,
    },
    result: {
      type: String,
      enum: ["Approved", "Rejected", "Pending", "Under Review"],
      default: "Pending",
    },
    reason: { type: String, default: null },

    // ── Manager Actions ───────────────────────────────────
    managerAction: {
      type: managerActionSchema,
      default: null,
    },

    // ── Loan Type ─────────────────────────────────────────
    loanType: {
      type: String,
      enum: ["personal", "home", "auto", "business", "education", "other"],
      default: "personal",
    },

    // ── Processing Metadata ───────────────────────────────
    processingErrors: [{ type: String }],
    ocrProvider: { type: String, default: null }, // "tesseract" | "easyocr"
    processingTimeMs: { type: Number, default: null },
    ipAddress: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// ── Virtual: Days since submission ────────────────────────
loanVerificationSchema.virtual("daysSinceSubmission").get(function () {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// ── Indexes ────────────────────────────────────────────────
loanVerificationSchema.index({ userId: 1, status: 1 });
loanVerificationSchema.index({ applicationId: 1 });
loanVerificationSchema.index({ createdAt: -1 });
loanVerificationSchema.index({ status: 1, createdAt: -1 });

const LoanVerification = mongoose.model("LoanVerification", loanVerificationSchema);
module.exports = LoanVerification;
