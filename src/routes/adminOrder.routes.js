const express = require("express");

const {
  getAdminOrders,
  getAdminOrder,
  updateOrderStatus,
  retryShiprocket,
} = require("../controllers/order.controller");

const {
  refundOrder,
} = require("../controllers/payment.controller");

const {
  protect,
  adminOnly,
} = require("../middleware/auth.middleware");

const router = express.Router();

// ======================================================
// ADMIN ORDERS
// ======================================================

router.use(protect);
router.use(adminOnly);

// Get all orders
router.get(
  "/",
  getAdminOrders
);

// Get one order
router.get(
  "/:id",
  getAdminOrder
);

// Move an order through its lifecycle
router.patch(
  "/:id/status",
  updateOrderStatus
);

// Retry a failed (or not-yet-attempted) Shiprocket push
router.post(
  "/:id/retry-shiprocket",
  retryShiprocket
);

// Refund a cancelled order's payment through Razorpay
// (full by default, or { amount } for a partial refund)
router.post(
  "/:id/refund",
  refundOrder
);

module.exports = router;