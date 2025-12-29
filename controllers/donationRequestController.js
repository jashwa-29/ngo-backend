const DonationRequest = require("../models/DonationRequest");
const User = require("../models/User");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Notification = require("../models/Notification");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "uploads/donation-requests";
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // Store only filename with extension
    const filename = file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname);
    cb(null, filename);
  },
});

const fileFilter = (req, file, cb) => {
  // Accept images and PDFs only
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only .png, .jpg, .jpeg and .pdf files are allowed!"));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: fileFilter,
});

// Helper function to get file URL (if needed for frontend)
const getFileUrl = (filename) => {
  if (!filename) return null;
  // In production, you might want to prepend your domain/CDN URL
  // For development, serve files through static route
  return `/uploads/donation-requests/${filename}`;
};

// @desc    Submit donation request (Receiver)
// @route   POST /receiver/RequestDonation
// @access  Private (Receiver only)
const submitDonationRequest = async (req, res) => {
  try {
    console.log("📝 Donation Request Received");
    console.log("User:", req.user.username, "Role:", req.user.role);
    console.log("Body Data:", req.body);
    console.log("Files:", req.files ? Object.keys(req.files) : "No files");

    const {
      patientname,
      age,
      gender,
      medicalproblem,
      number,
      donationamount,
      overview,
    } = req.body;

    // Validate required fields
    if (!patientname || !age || !gender || !number) {
      console.log("❌ Validation failed: Missing required fields");
      return res.status(400).json({
        message: "Please provide all required fields (patientname, age, gender, number)",
        missingFields: {
          patientname: !patientname,
          age: !age,
          gender: !gender,
          number: !number,
        },
      });
    }

    // Validate files
    if (!req.files || !req.files.medicalreport || !req.files.identificationproof) {
      console.log("❌ Validation failed: Missing required files");
      return res.status(400).json({
        message: "Medical report and ID proof are required",
        receivedFiles: req.files ? Object.keys(req.files) : [],
      });
    }

    // Get user ID from authenticated user (from token)
    const userId = req.user._id;

    // Verify user is a receiver
    if (req.user.role !== "RECEIVER") {
      console.log("❌ Access denied: User is not a receiver");
      return res.status(403).json({
        message: "Only receivers can submit donation requests",
      });
    }

    console.log("✅ Creating donation request for user:", userId);

    // Store only filenames
    const medicalReportFilename = req.files.medicalreport[0].filename;
    const identificationProofFilename = req.files.identificationproof[0].filename;
    const otherProofFilename = req.files.otherproof ? req.files.otherproof[0].filename : "";

    // Create donation request with filenames only
    const donationRequest = await DonationRequest.create({
      userId: userId,
      patientname,
      age: parseInt(age),
      gender,
      medicalproblem: medicalproblem || "",
      medicalreport: medicalReportFilename,
      identificationproof: identificationProofFilename,
      number,
      donationamount: donationamount || "",
      otherproof: otherProofFilename,
      overview: overview || "",
      status: "pending",
    });

    console.log("✅ Donation request created successfully:", donationRequest._id);

    // Prepare response with file URLs for frontend convenience
    const responseData = {
      ...donationRequest.toObject(),
      medicalreportUrl: getFileUrl(medicalReportFilename),
      identificationproofUrl: getFileUrl(identificationProofFilename),
      otherproofUrl: getFileUrl(otherProofFilename),
    };

    res.status(201).json({
      message: "Donation request submitted successfully",
      data: responseData,
    });
  } catch (error) {
    console.error("❌ Submit Donation Request Error:", error);
    
    // Clean up uploaded files if error occurs
    if (req.files) {
      Object.values(req.files).forEach(fileArray => {
        fileArray.forEach(file => {
          const filePath = path.join("uploads/donation-requests", file.filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        });
      });
    }

    res.status(500).json({
      message: error.message || "Failed to submit donation request",
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

// @desc    Get all donation requests (Admin)
// @route   GET /admin/GetAllDonationRequest
// @access  Private (Admin only)
const getAllDonationRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    // Build query
    const query = {};
    if (status) {
      query.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get donation requests with user details
    const donationRequests = await DonationRequest.find(query)
      .populate("userId", "username email mobile address")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Add file URLs to each request
    const donationRequestsWithUrls = donationRequests.map(request => {
      const requestObj = request.toObject();
      return {
        ...requestObj,
        medicalreportUrl: getFileUrl(requestObj.medicalreport),
        identificationproofUrl: getFileUrl(requestObj.identificationproof),
        otherproofUrl: getFileUrl(requestObj.otherproof),
      };
    });

    // Get total count
    const total = await DonationRequest.countDocuments(query);

    res.status(200).json({
      message: "Donation requests fetched successfully",
      data: donationRequestsWithUrls,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get All Donation Requests Error:", error);
    res.status(500).json({
      message: "Failed to fetch donation requests",
    });
  }
};

// @desc    Get single donation request by ID
// @route   GET /admin/GetSingleDonationRequest/:id
// @access  Private (Admin only)
const getSingleDonationRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const donationRequest = await DonationRequest.findById(id).populate(
      "userId",
      "username email mobile address"
    );

    if (!donationRequest) {
      return res.status(404).json({
        message: "Donation request not found",
      });
    }

    // Add file URLs
    const responseData = {
      ...donationRequest.toObject(),
      medicalreportUrl: getFileUrl(donationRequest.medicalreport),
      identificationproofUrl: getFileUrl(donationRequest.identificationproof),
      otherproofUrl: getFileUrl(donationRequest.otherproof),
    };

    res.status(200).json({
      message: "Donation request fetched successfully",
      data: responseData,
    });
  } catch (error) {
    console.error("Get Single Donation Request Error:", error);
    res.status(500).json({
      message: "Failed to fetch donation request",
    });
  }
};

// @desc    Get donation requests by recipient/user ID
// @route   GET /admin/GetSingleDonation/:recipientId
// @access  Private (Admin only)
const getDonationsByRecipientId = async (req, res) => {
  try {
    const { recipientId } = req.params;

    const donationRequests = await DonationRequest.find({
      userId: recipientId,
    })
      .populate("userId", "username email mobile address")
      .sort({ createdAt: -1 });

    // Add file URLs to each request
    const donationRequestsWithUrls = donationRequests.map(request => {
      const requestObj = request.toObject();
      return {
        ...requestObj,
        medicalreportUrl: getFileUrl(requestObj.medicalreport),
        identificationproofUrl: getFileUrl(requestObj.identificationproof),
        otherproofUrl: getFileUrl(requestObj.otherproof),
      };
    });

    res.status(200).json({
      message: "Donation requests fetched successfully",
      data: donationRequestsWithUrls,
    });
  } catch (error) {
    console.error("Get Donations By Recipient Error:", error);
    res.status(500).json({
      message: "Failed to fetch donation requests",
    });
  }
};

// @desc    Update donation request status (Admin)
// @route   PUT /admin/UpdateRequestStatus/:id/:status
// @access  Private (Admin only)
const updateRequestStatus = async (req, res) => {
  try {
    const { id, status } = req.params;

    // Validate status
    if (!["pending", "approved", "rejected", "achieved"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status. Must be pending, approved, rejected, or achieved",
      });
    }

    const donationRequest = await DonationRequest.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).populate("userId", "username email mobile address");

    if (!donationRequest) {
      return res.status(404).json({
        message: "Donation request not found",
      });
    }

    // Add file URLs
    const responseData = {
      ...donationRequest.toObject(),
      medicalreportUrl: getFileUrl(donationRequest.medicalreport),
      identificationproofUrl: getFileUrl(donationRequest.identificationproof),
      otherproofUrl: getFileUrl(donationRequest.otherproof),
    };

    res.status(200).json({
      message: `Donation request ${status} successfully`,
      data: responseData,
    });
  } catch (error) {
    console.error("Update Request Status Error:", error);
    res.status(500).json({
      message: "Failed to update request status",
    });
  }
};

// @desc    Get receiver's own donation requests
// @route   GET /receiver/MyRequests
// @access  Private (Receiver only)
const getMyDonationRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    const donationRequests = await DonationRequest.find({ userId })
      .sort({ createdAt: -1 });

    // Add file URLs to each request
    const donationRequestsWithUrls = donationRequests.map(request => {
      const requestObj = request.toObject();
      return {
        ...requestObj,
        medicalreportUrl: getFileUrl(requestObj.medicalreport),
        identificationproofUrl: getFileUrl(requestObj.identificationproof),
        otherproofUrl: getFileUrl(requestObj.otherproof),
      };
    });

    res.status(200).json({
      message: "Your donation requests fetched successfully",
      data: donationRequestsWithUrls,
    });
  } catch (error) {
    console.error("Get My Donation Requests Error:", error);
    res.status(500).json({
      message: "Failed to fetch your donation requests",
    });
  }
};

// @desc    Get receiver's single request details with donations
// @route   GET /receiver/RequestDetails/:id
// @access  Private (Receiver only)
const getReceiverRequestDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const request = await DonationRequest.findOne({ _id: id, userId });

    if (!request) {
      return res.status(404).json({ message: "Donation request not found" });
    }

    // Fetch successful donations for this request
    const donations = await Donation.find({ requestId: id, status: "success" })
      .populate("donorId", "username email")
      .sort({ createdAt: -1 });

    const totalRaised = donations.reduce((sum, d) => sum + d.amount, 0);

    const responseData = {
      ...request.toObject(),
      donations,
      summary: {
        totalRaised,
        donorCount: donations.length,
      },
      medicalreportUrl: getFileUrl(request.medicalreport),
      identificationproofUrl: getFileUrl(request.identificationproof),
      otherproofUrl: getFileUrl(request.otherproof),
    };

    res.status(200).json({
      message: "Request details fetched successfully",
      data: responseData,
    });
  } catch (error) {
    console.error("Get Receiver Request Details Error:", error);
    res.status(500).json({ message: "Failed to fetch request details" });
  }
};

// @desc    Delete donation request (Admin or Owner)
// @route   DELETE /admin/deleteDonationRequest/:id
// @access  Private (Admin only) or Owner
const deleteDonationRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    // Find the donation request
    const donationRequest = await DonationRequest.findById(id);

    if (!donationRequest) {
      return res.status(404).json({
        message: "Donation request not found",
      });
    }

    // Check permissions: Admin can delete any, user can only delete their own
    const isOwner = donationRequest.userId.toString() === userId.toString();
    const isAdmin = userRole === "ADMIN";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: "Not authorized to delete this donation request",
      });
    }

    // Delete associated files
    const deleteFile = (filename) => {
      if (filename) {
        const filePath = path.join("uploads/donation-requests", filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    };

    deleteFile(donationRequest.medicalreport);
    deleteFile(donationRequest.identificationproof);
    deleteFile(donationRequest.otherproof);

    // Delete associated notifications
    await Notification.deleteMany({ relatedId: id });

    // Delete from database
    await DonationRequest.findByIdAndDelete(id);

    res.status(200).json({
      message: "Donation request deleted successfully",
    });
  } catch (error) {
    console.error("Delete Donation Request Error:", error);
    res.status(500).json({
      message: "Failed to delete donation request",
    });
  }
};

// @desc    Get all donors (Admin)
// @route   GET /admin/GetAllDonors
// @access  Private (Admin only)
const getAllDonors = async (req, res) => {
  try {
    const donors = await User.find({ role: "DONOR" }).select("-password");
    res.status(200).json({
      message: "Donors fetched successfully",
      data: donors,
    });
  } catch (error) {
    console.error("Get All Donors Error:", error);
    res.status(500).json({
      message: "Failed to fetch donors",
    });
  }
};

// @desc    Get donor by ID with their donation history (Admin)
// @route   GET /admin/GetDonorDonation/:id
// @access  Private (Admin only)
const getDonorById = async (req, res) => {
  try {
    const { id } = req.params;
    const donor = await User.findById(id).select("-password");
    
    if (!donor || donor.role !== "DONOR") {
      return res.status(404).json({
        message: "Donor not found",
      });
    }

    // Fetch donations for this donor
    const donations = await Donation.find({ donorId: id })
      .populate("requestId", "patientname medicalproblem")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Donor fetched successfully",
      data: {
        ...donor.toObject(),
        donations,
      },
    });
  } catch (error) {
    console.error("Get Donor By ID Error:", error);
    res.status(500).json({
      message: "Failed to fetch donor details",
    });
  }
};

// @desc    Get all receivers (Admin)
// @route   GET /admin/GetAllReceivers
// @access  Private (Admin only)
const getAllReceivers = async (req, res) => {
  try {
    const receivers = await User.find({ role: "RECEIVER" }).select("-password");
    res.status(200).json({
      message: "Receivers fetched successfully",
      data: receivers,
    });
  } catch (error) {
    console.error("Get All Receivers Error:", error);
    res.status(500).json({
      message: "Failed to fetch receivers",
    });
  }
};

// @desc    Get all accepted donation requests (Public)
// @route   GET /Home/GetAcceptedRequest
// @access  Public
const getAcceptedDonationRequests = async (req, res) => {
  try {
    const donationRequests = await DonationRequest.find({ status: "approved" })
      .populate("userId", "username email mobile address")
      .sort({ createdAt: -1 });

    const donationRequestsWithUrls = donationRequests.map(request => {
      const requestObj = request.toObject();
      return {
        ...requestObj,
        id: requestObj._id,
        // Mapping fields for frontend compatibility if needed
        patientimg: requestObj.medicalreport, 
        medicalreportUrl: getFileUrl(requestObj.medicalreport),
        identificationproofUrl: getFileUrl(requestObj.identificationproof),
        otherproofUrl: getFileUrl(requestObj.otherproof),
      };
    });

    res.status(200).json(donationRequestsWithUrls);
  } catch (error) {
    console.error("Get Accepted Donation Requests Error:", error);
    res.status(500).json({
      message: "Failed to fetch donation requests",
    });
  }
};

const Donation = require("../models/Donation");

// @desc    Get donation status/raised amount for a request
// @route   GET /Home/GetdonationStatus/:id
// @access  Public
const getDonationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const donations = await Donation.find({ requestId: id, status: "success" });
    
    // The frontend expects an array of donation objects to reduce or a summary.
    // Based on CardSlider.jsx logic: Const raised = response.data?.reduce(...)
    res.status(200).json(donations);
  } catch (error) {
    console.error("Get Donation Status Error:", error);
    res.status(500).json({ message: "Failed to fetch donation status" });
  }
};

// @desc    Get single donation request details (Public)
// @route   GET /Home/GetSingleRequest/:id
// @access  Public
const getSingleDonationRequestPublic = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await DonationRequest.findById(id).select("-userId"); // Don't expose requester user info to everyone

    if (!request || request.status !== "approved") {
      return res.status(404).json({ message: "Request not found" });
    }

    res.status(200).json({
      message: "Request details fetched successfully",
      data: request,
    });
  } catch (error) {
    console.error("Get Single Request Public Error:", error);
    res.status(500).json({ message: "Failed to fetch request details" });
  }
};

module.exports = {
  upload,
  submitDonationRequest,
  getAllDonationRequests,
  getSingleDonationRequest,
  getDonationsByRecipientId,
  updateRequestStatus,
  getMyDonationRequests,
  deleteDonationRequest,
  getAllDonors,
  getDonorById,
  getAllReceivers,
  getAcceptedDonationRequests,
  getDonationStatus,
  getSingleDonationRequestPublic,
  getReceiverRequestDetails,
};
