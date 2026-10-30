const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    razorpayPaymentId: {
      type: String,
      default: null,
      index: true,
    },

    razorpaySignature: {
      type: String,
      default: null,
      select: false,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
    },

    status: {
      type: String,
      enum: [
        "created",
        "authorized",
        "captured",
        "failed",
        "refunded",
      ],
      default: "created",
      index: true,
    },

    failureReason: {
      type: String,
      default: null,
    },

    // Running total refunded through Razorpay. Status only
    // becomes "refunded" once this reaches `amount`; a
    // partial refund leaves the payment "captured".
    amountRefunded: {
      type: Number,
      default: 0,
      min: 0,
    },

    // One entry per refund an admin issued.
    refunds: [
      {
        razorpayRefundId: {
          type: String,
          required: true,
        },
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
        // Razorpay's own status: "pending" until the bank
        // confirms, then "processed".
        status: {
          type: String,
          default: "pending",
        },
        reason: {
          type: String,
          default: "",
          trim: true,
          maxlength: 300,
        },
        refundedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Payment",
  paymentSchema
);