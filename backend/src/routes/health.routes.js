/**
 * Health Check Route
 * GET /api/health
 * Used by load balancers and monitoring tools
 */

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { checkAIServiceHealth } = require("../services/ai.service");

router.get("/", async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  const aiHealth = await checkAIServiceHealth();

  const status = dbStatus === "connected" ? "ok" : "degraded";

  return res.status(status === "ok" ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    services: {
      database: dbStatus,
      aiService: aiHealth.online ? "online" : "offline",
    },
    uptime: Math.floor(process.uptime()),
  });
});

module.exports = router;
