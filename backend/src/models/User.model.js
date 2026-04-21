/**
 * User Model
 * Supports both Google OAuth and email/password login
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // Never return password in queries
    },

    // ── Role & Access ─────────────────────────────────────
    role: {
      type: String,
      enum: {
        values: ["client", "manager", "admin"],
        message: "Role must be client, manager, or admin",
      },
      default: "client",
    },

    // ── OAuth ─────────────────────────────────────────────
    googleId: {
      type: String,
      sparse: true, // Allows multiple null values (unique only if set)
      index: true,
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    photoUrl: {
      type: String,
      default: null,
    },

    // ── Status ────────────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
      default: null,
    },

    // ── Loan Application Profile ──────────────────────────
    profile: {
      phone: { type: String, default: null },
      address: { type: String, default: null },
      panNumber: { type: String, default: null }, // Indian PAN card
      aadhaarNumber: { type: String, default: null }, // Indian Aadhaar
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Pre-save: Hash password ────────────────────────────────
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ── Method: Compare password ───────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// ── Virtual: Full display name ─────────────────────────────
userSchema.virtual("displayName").get(function () {
  return this.name || this.email;
});

// ── Indexes ────────────────────────────────────────────────
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

const User = mongoose.model("User", userSchema);
module.exports = User;
