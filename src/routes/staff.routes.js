const express = require("express");

const {
  listStaff,
  createStaff,
  updateStaff,
  deleteStaff,
} = require("../controllers/staff.controller");

const {
  protect,
  superAdminOnly,
} = require("../middleware/auth.middleware");

const router = express.Router();

// Staff management is for admins only - never for staff.
router.use(protect);
router.use(superAdminOnly);

router.get("/", listStaff);
router.post("/", createStaff);
router.patch("/:id", updateStaff);
router.delete("/:id", deleteStaff);

module.exports = router;
