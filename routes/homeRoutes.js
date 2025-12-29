const express = require("express");
const router = express.Router();
const {
  getAcceptedDonationRequests,
  getDonationStatus,
  getSingleDonationRequestPublic,
} = require("../controllers/donationRequestController");
const path = require("path");
const fs = require("fs");

// @route   GET /Home/GetAcceptedRequest
// @desc    Get all accepted donation requests
// @access  Public
router.get("/GetAcceptedRequest", getAcceptedDonationRequests);

// @route   GET /Home/GetSingleRequest/:id
// @desc    Get details of a single donation request
router.get("/GetSingleRequest/:id", getSingleDonationRequestPublic);

// @route   GET /Home/GetdonationStatus/:id
// @desc    Get donation status for a specific request
router.get("/GetdonationStatus/:id", getDonationStatus);

// @route   GET /Home/image/:filename
// @desc    Serve medical report as an image (if it's an image)
router.get("/image/:filename", (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, "../uploads/donation-requests", filename);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(path.resolve(filePath));
  } else {
    res.status(404).json({ message: "Image not found" });
  }
});

module.exports = router;
