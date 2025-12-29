const express = require("express");
const router = express.Router();
const {
  makeDonation,
  getMyDonations,
} = require("../controllers/donationController");
const { protect } = require("../middleware/authMiddleware");

// All routes require authentication
router.use(protect);

// @route   POST /donor/donate
// @desc    Make a donation
router.post("/donate", makeDonation);

// @route   GET /donor/MyDonations
// @desc    Get donor's own donations
router.get("/MyDonations", getMyDonations);

module.exports = router;
