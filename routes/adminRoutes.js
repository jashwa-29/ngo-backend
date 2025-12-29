const express = require("express");
const router = express.Router();
const {
  getAllDonationRequests,
  getSingleDonationRequest,
  getDonationsByRecipientId,
  updateRequestStatus,
  deleteDonationRequest,
  getAllDonors,
  getDonorById,
  getAllReceivers,
} = require("../controllers/donationRequestController");
const { getRequestDonations, getAllDonations } = require("../controllers/donationController");
const { getNotifications, markAsRead, deleteNotification } = require("../controllers/notificationController");
const { protect, isAdmin } = require("../middleware/authMiddleware");

// All routes require authentication and admin role
router.use(protect);
router.use(isAdmin);

// --- Donation Request Routes ---

// @route   GET /admin/GetAllDonationRequest
// @desc    Get all donation requests with optional filtering and pagination
router.get("/GetAllDonationRequest", getAllDonationRequests);

// @route   GET /admin/GetSingleDonationRequest/:id
// @desc    Get single donation request by ID
router.get("/GetSingleDonationRequest/:id", getSingleDonationRequest);

// @route   GET /admin/GetSingleDonation/:recipientId
// @desc    Get all donation requests by recipient/user ID
router.get("/GetSingleDonation/:recipientId", getDonationsByRecipientId);

// @route   PUT /admin/UpdateRequestStatus/:id/:status
// @desc    Update donation request status (approve/reject)
router.put("/UpdateRequestStatus/:id/:status", updateRequestStatus);

// @route   DELETE /admin/deleteDonationRequest/:id
// @desc    Delete donation request
router.delete("/deleteDonationRequest/:id", deleteDonationRequest);

// @route   GET /admin/GetRequestDonations/:id
// @desc    Get all donations for a specific request
router.get("/GetRequestDonations/:id", getRequestDonations);

// @route   GET /admin/GetAllDonations
// @desc    Get all donations across all requests
router.get("/GetAllDonations", getAllDonations);

// --- User Management Routes ---

// @route   GET /admin/GetAllDonors
// @desc    Get all donors
router.get("/GetAllDonors", getAllDonors);

// @route   GET /admin/GetDonorDonation/:id
// @desc    Get donor by ID with history
router.get("/GetDonorDonation/:id", getDonorById);

// @route   GET /admin/GetAllReceivers
// @desc    Get all receivers
router.get("/GetAllReceivers", getAllReceivers);

// --- Notification Routes ---

// @route   GET /admin/notifications
// @desc    Get all admin notifications
router.get("/notifications", getNotifications);

// @route   PUT /admin/notifications/:id/read
// @desc    Mark notification as read
router.put("/notifications/:id/read", markAsRead);

// @route   DELETE /admin/notifications/:id
// @desc    Delete notification
router.delete("/notifications/:id", deleteNotification);

module.exports = router;

