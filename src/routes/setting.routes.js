const express = require("express");

const {
  getShippingSettings,
  updateShippingSettings,
  getGiftSettings,
  updateGiftSettings,
  getDealStrip,
  updateDealStrip,
} = require("../controllers/setting.controller");

const {
  protect,
  adminOnly,
} = require("../middleware/auth.middleware");

const router = express.Router();

// ======================================================
// ADMIN
// ======================================================

router.get(
  "/shipping",
  protect,
  adminOnly,
  getShippingSettings
);

router.put(
  "/shipping",
  protect,
  adminOnly,
  updateShippingSettings
);

router.get(
  "/gift",
  protect,
  adminOnly,
  getGiftSettings
);

router.put(
  "/gift",
  protect,
  adminOnly,
  updateGiftSettings
);

router.get(
  "/deal-strip",
  protect,
  adminOnly,
  getDealStrip
);

router.put(
  "/deal-strip",
  protect,
  adminOnly,
  updateDealStrip
);

module.exports = router;
