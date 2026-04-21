/**
 * History Routes
 * /api/history/...
 */

const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authenticate");
const { getHistory, getHistoryDetail, cancelApplication } = require("../controllers/history.controller");

// GET /api/history — User's own history (clients) or all (managers)
router.get("/", authenticate, getHistory);

// GET /api/history/:id — Single record detail
router.get("/:id", authenticate, getHistoryDetail);

// DELETE /api/history/:id — Cancel a pending application (client only)
router.delete("/:id", authenticate, cancelApplication);

module.exports = router;
