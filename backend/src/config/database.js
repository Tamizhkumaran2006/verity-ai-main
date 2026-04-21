/**
 * Database Configuration - MongoDB via Mongoose
 */

const mongoose = require("mongoose");
const logger = require("./logger");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);

    mongoose.connection.on("error", (err) => {
      logger.error("MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected.");
    });
  } catch (error) {
    // Non-fatal: server starts but DB features will fail gracefully
    logger.warn(`⚠️  MongoDB unavailable: ${error.message}`);
    logger.warn("Server starting WITHOUT database. Start MongoDB for full functionality.");
  }
};

module.exports = connectDB;
