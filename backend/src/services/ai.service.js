/**
 * AI Service Bridge
 * Communicates with the Python FastAPI AI service via HTTP
 * Handles OCR extraction and AI decision requests
 */

const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
const logger = require("../config/logger");

const AI_SERVICE_URL = process.env.PYTHON_AI_SERVICE_URL || "http://localhost:8000";
const AI_API_KEY = process.env.AI_SERVICE_API_KEY || "";

// Axios client with auth header and timeout
const aiClient = axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: 120_000, // 2 minutes for heavy OCR
  headers: {
    "X-API-Key": AI_API_KEY,
  },
});

/**
 * Extract text and structured fields from a document file
 * Calls: POST /ai/extract
 *
 * @param {string} filePath - Absolute path to the uploaded file
 * @param {string} mimeType - MIME type of the file
 * @param {string} loanType - e.g. "personal", "home", "business"
 * @returns {Promise<Object>} Extracted structured data
 */
const extractDocumentData = async (filePath, mimeType, loanType = "personal") => {
  const startTime = Date.now();

  try {
    logger.info(`📤 Sending file to AI service for extraction: ${path.basename(filePath)}`);

    const form = new FormData();
    form.append("file", fs.createReadStream(filePath), {
      filename: path.basename(filePath),
      contentType: mimeType,
    });
    form.append("loan_type", loanType);

    const response = await aiClient.post("/ai/extract", form, {
      headers: form.getHeaders(),
    });

    const elapsed = Date.now() - startTime;
    logger.info(`✅ AI extraction complete in ${elapsed}ms`);

    return {
      success: true,
      data: response.data,
      processingTimeMs: elapsed,
    };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    logger.error(`❌ AI extraction failed after ${elapsed}ms:`, error.message);

    if (error.code === "ECONNREFUSED") {
      throw new Error("AI service is unavailable. Please try again later.");
    }

    if (error.response) {
      throw new Error(
        error.response.data?.detail || `AI service error: ${error.response.status}`
      );
    }

    throw new Error(`AI extraction failed: ${error.message}`);
  }
};

/**
 * Run AI-driven loan decision logic
 * Calls: POST /ai/decide
 *
 * @param {Object} extractedData - Structured data from OCR
 * @param {string} loanType - Loan category
 * @returns {Promise<Object>} Decision result with rule checks
 */
const getAIDecision = async (extractedData, loanType = "personal") => {
  try {
    logger.info(`🤖 Requesting AI decision for loan type: ${loanType}`);

    const response = await aiClient.post("/ai/decide", {
      extracted_data: extractedData,
      loan_type: loanType,
    });

    return {
      success: true,
      decision: response.data,
    };
  } catch (error) {
    logger.error("❌ AI decision failed:", error.message);

    if (error.code === "ECONNREFUSED") {
      throw new Error("AI service is unavailable.");
    }

    throw new Error(`AI decision failed: ${error.message}`);
  }
};

/**
 * Health check for the AI service
 */
const checkAIServiceHealth = async () => {
  try {
    const response = await aiClient.get("/health", { timeout: 5000 });
    return { online: true, ...response.data };
  } catch {
    return { online: false };
  }
};

module.exports = { extractDocumentData, getAIDecision, checkAIServiceHealth };
