const mongoose = require("mongoose");
const { parsePermission } = require("../config/permissions");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    // ======================================================
    // BASIC USER INFORMATION
    // ======================================================

    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [
        2,
        "Name must be at least 2 characters",
      ],
      maxlength: [
        100,
        "Name cannot exceed 100 characters",
      ],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    // ======================================================
    // PASSWORD
    // ======================================================

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [
        8,
        "Password must be at least 8 characters",
      ],
      select: false,
    },

    // ======================================================
    // ROLE
    // ======================================================

    role: {
      type: String,
      enum: ["customer", "admin", "staff"],
      default: "customer",
      index: true,
    },

    // ======================================================
    // STAFF ACCESS (role "staff" only)
    //
    // staffTitle is a free label ("Order Manager"); the
    // permissions list is what the API actually enforces -
    // see config/permissions.js.
    // ======================================================

    staffTitle: {
      type: String,
      trim: true,
      maxlength: [60, "Staff role cannot exceed 60 characters"],
      default: "",
    },

    // "products" = full access, "products:view" = read-only.
    permissions: {
      type: [String],
      default: [],
      validate: {
        validator: (list) => list.every((value) => parsePermission(value)),
        message: "Unknown permission",
      },
    },

    // ======================================================
    // ACCOUNT STATUS
    // ======================================================

    isVerified: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // ======================================================
    // PASSWORD RESET
    // ======================================================

    resetPasswordTokenHash: {
      type: String,
      default: null,
      select: false,
    },

    resetPasswordExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },

    // ======================================================
    // EMAIL VERIFICATION
    // ======================================================

    emailVerificationTokenHash: {
      type: String,
      default: null,
      select: false,
    },

    emailVerificationExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// ======================================================
// HASH PASSWORD BEFORE SAVE
// ======================================================

userSchema.pre("save", async function () {
  // Don't hash if password hasn't changed
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(12);

  this.password =
    await bcrypt.hash(
      this.password,
      salt
    );
});

// ======================================================
// COMPARE PASSWORD
// ======================================================

userSchema.methods.comparePassword =
  async function (enteredPassword) {
    return bcrypt.compare(
      enteredPassword,
      this.password
    );
  };

// ======================================================
// MODEL
// ======================================================

module.exports = mongoose.model(
  "User",
  userSchema
);