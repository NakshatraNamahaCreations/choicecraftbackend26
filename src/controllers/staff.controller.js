const mongoose = require("mongoose");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const {
  MODULES,
  parsePermission,
} = require("../config/permissions");

// ======================================================
// STAFF MANAGEMENT - ADMIN ONLY
//
// Staff are User documents with role "staff", a free
// staffTitle and the list of admin-panel modules they may
// use. Mounted behind protect + superAdminOnly.
// ======================================================

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const publicStaff = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone || "",
  staffTitle: user.staffTitle || "",
  permissions: user.permissions || [],
  isActive: user.isActive !== false,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// Returns [cleanList, error].
const cleanPermissions = (value) => {
  if (!Array.isArray(value)) {
    return [null, "permissions must be a list of modules"];
  }
  const unique = [...new Set(value.map(String))];
  const unknown = unique.filter((key) => !parsePermission(key));
  if (unknown.length) {
    return [null, `Unknown permission(s): ${unknown.join(", ")}`];
  }
  // One level per module: keep full access over view-only.
  const byModule = new Map();
  for (const key of unique) {
    const { module, level } = parsePermission(key);
    if (byModule.get(module) !== "manage") byModule.set(module, level);
  }
  const clean = [...byModule].map(([module, level]) =>
    level === "manage" ? module : `${module}:view`
  );
  if (!clean.length) {
    return [null, "Give the staff member access to at least one section"];
  }
  return [clean, ""];
};

// Signs a staff member out everywhere (deactivated, deleted
// or given a new password).
const revokeSessions = (userId) =>
  RefreshToken.updateMany(
    { user: userId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );

const findStaff = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return User.findOne({ _id: id, role: "staff" });
};

// GET /api/admin/staff
const listStaff = async (req, res, next) => {
  try {
    const staff = await User.find({ role: "staff" })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        staff: staff.map(publicStaff),
        modules: MODULES,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/staff
const createStaff = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      staffTitle,
      permissions,
      isActive,
    } = req.body || {};

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address",
      });
    }

    if (String(password).length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    const [modules, permissionError] = cleanPermissions(permissions);
    if (permissionError) {
      return res.status(400).json({
        success: false,
        message: permissionError,
      });
    }

    if (await User.exists({ email: normalizedEmail })) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: (phone || "").trim(),
      password: String(password),
      role: "staff",
      staffTitle: (staffTitle || "").trim(),
      permissions: modules,
      isActive: typeof isActive === "boolean" ? isActive : true,
      isVerified: true,
    });

    return res.status(201).json({
      success: true,
      message: "Staff member created",
      data: { staff: publicStaff(user) },
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/staff/:id
const updateStaff = async (req, res, next) => {
  try {
    const staff = await findStaff(req.params.id);
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    const {
      name,
      phone,
      staffTitle,
      permissions,
      isActive,
      password,
    } = req.body || {};
    let signOut = false;

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({
          success: false,
          message: "Name cannot be empty",
        });
      }
      staff.name = String(name).trim();
    }
    if (phone !== undefined) staff.phone = String(phone || "").trim();
    if (staffTitle !== undefined) staff.staffTitle = String(staffTitle || "").trim();

    if (permissions !== undefined) {
      const [modules, permissionError] = cleanPermissions(permissions);
      if (permissionError) {
        return res.status(400).json({
          success: false,
          message: permissionError,
        });
      }
      staff.permissions = modules;
    }

    if (typeof isActive === "boolean") {
      if (staff.isActive && !isActive) signOut = true;
      staff.isActive = isActive;
    }

    if (password) {
      if (String(password).length < 8) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 8 characters",
        });
      }
      staff.password = String(password);
      signOut = true;
    }

    await staff.save();
    if (signOut) await revokeSessions(staff._id);

    return res.status(200).json({
      success: true,
      message: "Staff member updated",
      data: { staff: publicStaff(staff) },
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/admin/staff/:id
const deleteStaff = async (req, res, next) => {
  try {
    const staff = await findStaff(req.params.id);
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    await revokeSessions(staff._id);
    await staff.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Staff member removed",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listStaff,
  createStaff,
  updateStaff,
  deleteStaff,
};
