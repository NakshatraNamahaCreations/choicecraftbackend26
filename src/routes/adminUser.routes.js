const express = require("express");

const {
  getAdminUsers,
  getAdminUser,
  updateUserRole,
  updateUserStatus,
} = require("../controllers/adminUser.controller");

const {
  protect,
  adminOnly,
  superAdminOnly,
} = require("../middleware/auth.middleware");
const User = require("../models/User");

// Staff with Customers access may suspend customers, but
// never an admin or another staff account.
const customersOnlyForStaff = async (req, res, next) => {
  if (req.user.role === "admin") return next();
  try {
    const target = await User.findById(req.params.userId)
      .select("role")
      .lean();
    if (target && target.role !== "customer") {
      return res.status(403).json({
        success: false,
        message: "Only an admin can change admin or staff accounts",
      });
    }
    next();
  } catch (error) {
    next(error);
  }
};

const router = express.Router();

// All admin user APIs require:
// 1. Login
// 2. Admin role
router.use(protect);
router.use(adminOnly);


// ======================================================
// GET ALL USERS
// ======================================================

router.get(
  "/",
  getAdminUsers
);
// Update user role
// Promoting someone to admin is admin-only.
router.patch(
  "/:userId/role",
  superAdminOnly,
  updateUserRole
);

// Suspend or reactivate an account
router.patch(
  "/:userId/status",
  customersOnlyForStaff,
  updateUserStatus
);

// Get one user with their order summary
// Declared last so it does not shadow the routes above
router.get(
  "/:userId",
  getAdminUser
);

module.exports = router;