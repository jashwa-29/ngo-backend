const express = require("express");
const router = express.Router();
const { createPaymentIntent, handleWebhook, confirmTestPayment } = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");

// Create Intent - Protected
router.post("/create-intent", protect, createPaymentIntent);

// Confirm Test Payment - Protected
router.post("/confirm-test-payment", protect, confirmTestPayment);

module.exports = router;
