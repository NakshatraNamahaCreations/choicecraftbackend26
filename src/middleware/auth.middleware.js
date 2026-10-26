const {
  verifyAccessToken,
} = require("../utils/jwt");
const User = require("../models/User");
const {
  MODULES,
  levelFor,
  moduleForUrl,
} = require("../config/permissions");

// Requests that only read. Everything else needs full access.
const READ_METHODS = ["GET", "HEAD", "OPTIONS"];

// ======================================================
// PROTECT AUTHENTICATED ROUTES
// ======================================================

const protect = (
  req,
  res,
  next
) => {
  try {
    const authorization =
      req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    const [scheme, token] =
      authorization.split(" ");

    if (
      scheme !== "Bearer" ||
      !token
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid authorization format",
      });
    }

    const decoded =
      verifyAccessToken(token);

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message:
        "Invalid or expired access token",
    });
  }
};

// ======================================================
// ADMIN PANEL ACCESS (admins + permitted staff)
//
// Admins pass everywhere. A staff account passes only for
// the module this URL belongs to (config/permissions.js),
// and is re-read from the database on each request so a
// permission change or deactivation applies immediately,
// not when their access token expires.
// ======================================================

const adminOnly = async (
  req,
  res,
  next
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message:
        "Authentication required",
    });
  }

  if (req.user.role === "admin") {
    return next();
  }

  if (req.user.role !== "staff") {
    return res.status(403).json({
      success: false,
      message:
        "Admin access required",
    });
  }

  try {
    const staff = await User.findById(
      req.user.userId
    )
      .select("role isActive permissions")
      .lean();

    if (
      !staff ||
      staff.role !== "staff" ||
      !staff.isActive
    ) {
      return res.status(403).json({
        success: false,
        message:
          "This staff account is no longer active",
      });
    }

    const needed = moduleForUrl(
      req.originalUrl
    );
    const anyOf = Array.isArray(needed)
      ? needed
      : needed
        ? [needed]
        : [];
    const granted = staff.permissions || [];
    const levels = anyOf.map((key) =>
      levelFor(granted, key)
    );
    const label =
      MODULES.find(
        (m) => m.key === anyOf[0]
      )?.label || "this section";

    if (!levels.some(Boolean)) {
      return res.status(403).json({
        success: false,
        message: `You don't have access to ${label}. Ask an admin to grant it.`,
      });
    }

    // View-only staff may read, never change anything.
    if (
      !READ_METHODS.includes(req.method) &&
      !levels.includes("manage")
    ) {
      return res.status(403).json({
        success: false,
        message: `You have view-only access to ${label}. Ask an admin for full access to make changes.`,
      });
    }

    req.user.permissions = granted;
    next();
  } catch (error) {
    next(error);
  }
};

// ======================================================
// SUPER ADMIN ONLY (role "admin") - staff management
// ======================================================

const superAdminOnly = (
  req,
  res,
  next
) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      success: false,
      message:
        "Only an admin can manage staff",
    });
  }

  next();
};

module.exports = {
  protect,
  adminOnly,
  superAdminOnly,
};
