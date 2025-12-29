const express = require("express");
const router = express.Router();
const {
  upload,
  submitDonationRequest,
  getMyDonationRequests,
  getReceiverRequestDetails,
} = require("../controllers/donationRequestController");
const { protect, isReceiver } = require("../middleware/authMiddleware");

// All routes require authentication and receiver role
router.use(protect);
router.use(isReceiver);

// @route   POST /receiver/RequestDonation
// @desc    Submit a new donation request
// @access  Private (Receiver only)
router.post(
  "/RequestDonation",
  upload.fields([
    { name: "medicalreport", maxCount: 1 },
    { name: "identificationproof", maxCount: 1 },
    { name: "otherproof", maxCount: 1 },
  ]),
  submitDonationRequest
);

// @route   GET /receiver/MyRequests
// @desc    Get receiver's own donation requests
// @access  Private (Receiver only)
router.get("/MyRequests", getMyDonationRequests);

// @route   GET /receiver/RequestDetails/:id
// @desc    Get details of a specific request
// @access  Private (Receiver only)
router.get("/RequestDetails/:id", getReceiverRequestDetails);

module.exports = router;
