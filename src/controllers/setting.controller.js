const mongoose = require("mongoose");
const Setting = require("../models/Setting");
const Product = require("../models/Product");

// Every shipping field is a plain "number >= 0", so the check is
// written once here instead of four times over.
const SHIPPING_FIELDS = [
  "shippingCharge",
  "freeShippingThreshold",
  "expressShippingCharge",
  "sameDayDeliveryCharge",
];

const shippingResponseData = (
  setting
) => ({
  shippingCharge:
    setting.shippingCharge,
  freeShippingThreshold:
    setting.freeShippingThreshold,
  expressShippingCharge:
    setting.expressShippingCharge,
  sameDayDeliveryCharge:
    setting.sameDayDeliveryCharge,
});

// ======================================================
// GET SHIPPING SETTINGS
//
// Same handler backs both the admin route (protect +
// adminOnly) and the public route the storefront reads
// before checkout - nothing returned here is sensitive.
// ======================================================

const getShippingSettings = async (
  req,
  res,
  next
) => {
  try {
    const setting =
      await Setting.getSingleton();

    return res.status(200).json({
      success: true,
      data: shippingResponseData(
        setting
      ),
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// UPDATE SHIPPING SETTINGS - ADMIN
//
// Default shipping and the free-shipping threshold are what
// checkout actually charges (see utils/orderStock.js). Express
// and same-day are priced here too, ready for a future "choose
// your delivery speed" step at checkout, but nothing selects
// them yet.
// ======================================================

const updateShippingSettings = async (
  req,
  res,
  next
) => {
  try {
    const body = req.body || {};

    const provided =
      SHIPPING_FIELDS.filter(
        (field) =>
          body[field] !== undefined
      );

    if (provided.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          `Provide at least one of: ${SHIPPING_FIELDS.join(", ")}`,
      });
    }

    const values = {};

    for (const field of provided) {
      const value = Number(
        body[field]
      );

      if (
        Number.isNaN(value) ||
        value < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            `${field} must be a number >= 0`,
        });
      }

      values[field] = value;
    }

    const setting =
      await Setting.getSingleton();

    Object.assign(
      setting,
      values
    );

    await setting.save();

    return res.status(200).json({
      success: true,
      message:
        "Shipping settings updated successfully",
      data: shippingResponseData(
        setting
      ),
    });
  } catch (error) {
    next(error);
  }
};

// A populated product doc -> the small shape the admin UI needs to
// show "currently: <name>". Null when nothing is configured yet.
const giftProductSummary = (
  product
) =>
  product
    ? {
        id: product._id,
        name: product.name,
        image: product.image?.url || "",
      }
    : null;

// ======================================================
// GET FREE GIFT SETTINGS - ADMIN
// ======================================================

const getGiftSettings = async (
  req,
  res,
  next
) => {
  try {
    const setting = await (
      await Setting.getSingleton()
    ).populate(
      "freeGiftProduct",
      "name image"
    );

    return res.status(200).json({
      success: true,
      data: {
        freeGiftThreshold:
          setting.freeGiftThreshold,
        freeGiftProduct:
          giftProductSummary(
            setting.freeGiftProduct
          ),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// UPDATE FREE GIFT SETTINGS - ADMIN
//
// The gift is one fixed product, not a picker the customer
// chooses from - simpler to run, and there is never a "the
// gift I wanted sold out mid-checkout" case to handle.
// ======================================================

const updateGiftSettings = async (
  req,
  res,
  next
) => {
  try {
    const {
      freeGiftThreshold,
      freeGiftProductId,
    } = req.body || {};

    if (
      freeGiftThreshold ===
        undefined &&
      freeGiftProductId === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Provide freeGiftThreshold and/or freeGiftProductId",
      });
    }

    let thresholdValue;

    if (
      freeGiftThreshold !== undefined
    ) {
      thresholdValue = Number(
        freeGiftThreshold
      );

      if (
        Number.isNaN(
          thresholdValue
        ) ||
        thresholdValue < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "freeGiftThreshold must be a number >= 0",
        });
      }
    }

    let productValue;

    if (
      freeGiftProductId !== undefined
    ) {
      // Empty string / null clears the gift - no product means no
      // free gift is attached, even past the threshold.
      if (!freeGiftProductId) {
        productValue = null;
      } else {
        if (
          !mongoose.Types.ObjectId.isValid(
            freeGiftProductId
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid freeGiftProductId",
          });
        }

        const product =
          await Product.findOne({
            _id: freeGiftProductId,
            isActive: true,
          }).lean();

        if (!product) {
          return res.status(400).json({
            success: false,
            message:
              "Selected product was not found or is inactive",
          });
        }

        productValue = product._id;
      }
    }

    const setting =
      await Setting.getSingleton();

    if (thresholdValue !== undefined) {
      setting.freeGiftThreshold =
        thresholdValue;
    }

    if (productValue !== undefined) {
      setting.freeGiftProduct =
        productValue;
    }

    await setting.save();
    await setting.populate(
      "freeGiftProduct",
      "name image"
    );

    return res.status(200).json({
      success: true,
      message:
        "Free gift settings updated successfully",
      data: {
        freeGiftThreshold:
          setting.freeGiftThreshold,
        freeGiftProduct:
          giftProductSummary(
            setting.freeGiftProduct
          ),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// DEAL STRIP (homepage offer ticker)
// ======================================================

const DEAL_STRIP_MAX_ITEMS = 8;
const DEAL_STRIP_MAX_LENGTH = 80;

const getDealStrip = async (
  req,
  res,
  next
) => {
  try {
    const setting =
      await Setting.getSingleton();

    return res.status(200).json({
      success: true,
      data: {
        messages: setting.dealStrip || [],
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateDealStrip = async (
  req,
  res,
  next
) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        message: "messages must be a list of text lines",
      });
    }

    const cleaned = messages
      .map((m) =>
        typeof m === "string"
          ? m.replace(/\s+/g, " ").trim()
          : ""
      )
      .filter(Boolean);

    if (cleaned.length > DEAL_STRIP_MAX_ITEMS) {
      return res.status(400).json({
        success: false,
        message: `Use at most ${DEAL_STRIP_MAX_ITEMS} messages`,
      });
    }

    const tooLong = cleaned.find(
      (m) => m.length > DEAL_STRIP_MAX_LENGTH
    );
    if (tooLong) {
      return res.status(400).json({
        success: false,
        message: `Each message must be ${DEAL_STRIP_MAX_LENGTH} characters or fewer`,
      });
    }

    const setting =
      await Setting.getSingleton();
    setting.dealStrip = cleaned;
    await setting.save();

    return res.status(200).json({
      success: true,
      message: "Deal strip updated",
      data: {
        messages: setting.dealStrip,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// CONTACT DETAILS (Contact Us page, footer, call and
// WhatsApp buttons)
// ======================================================

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const contactResponseData = (setting) => ({
  phone: setting.contactPhone,
  email: setting.contactEmail,
  whatsapp: setting.contactWhatsapp,
});

const getContactSettings = async (
  req,
  res,
  next
) => {
  try {
    const setting =
      await Setting.getSingleton();

    return res.status(200).json({
      success: true,
      data: contactResponseData(setting),
    });
  } catch (error) {
    next(error);
  }
};

const updateContactSettings = async (
  req,
  res,
  next
) => {
  try {
    const { phone, email, whatsapp } =
      req.body || {};
    const values = {};

    if (phone !== undefined) {
      const cleaned = String(phone)
        .replace(/\s+/g, " ")
        .trim();
      const digits = cleaned.replace(/\D/g, "");

      if (
        !/^[+\d\s()-]+$/.test(cleaned) ||
        digits.length < 7 ||
        digits.length > 15
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Enter a valid phone number, e.g. +91 74001 81786",
        });
      }
      values.contactPhone = cleaned;
    }

    if (email !== undefined) {
      const cleaned = String(email)
        .trim()
        .toLowerCase();

      if (
        !EMAIL_PATTERN.test(cleaned) ||
        cleaned.length > 254
      ) {
        return res.status(400).json({
          success: false,
          message: "Enter a valid email address",
        });
      }
      values.contactEmail = cleaned;
    }

    if (whatsapp !== undefined) {
      let digits = String(whatsapp).replace(
        /\D/g,
        ""
      );

      // A bare 10-digit Indian mobile - add the country code
      // wa.me needs rather than reject it.
      if (digits.length === 10) {
        digits = "91" + digits;
      }

      if (digits.length < 11 || digits.length > 15) {
        return res.status(400).json({
          success: false,
          message:
            "Enter the WhatsApp number with country code, e.g. 91 74001 81786",
        });
      }
      values.contactWhatsapp = digits;
    }

    if (!Object.keys(values).length) {
      return res.status(400).json({
        success: false,
        message:
          "Send at least one of phone, email or whatsapp",
      });
    }

    const setting =
      await Setting.getSingleton();
    Object.assign(setting, values);
    await setting.save();

    return res.status(200).json({
      success: true,
      message: "Contact details updated",
      data: contactResponseData(setting),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getShippingSettings,
  updateShippingSettings,
  getGiftSettings,
  updateGiftSettings,
  getDealStrip,
  updateDealStrip,
  getContactSettings,
  updateContactSettings,
};
