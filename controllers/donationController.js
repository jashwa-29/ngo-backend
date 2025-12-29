const Donation = require("../models/Donation");
const DonationRequest = require("../models/DonationRequest");
const Notification = require("../models/Notification");
const axios = require("axios");

// @desc    Make a donation
// @route   POST /donor/donate
// @access  Private (Donor only)
const makeDonation = async (req, res) => {
  try {
    const { requestId, amount, message, currency } = req.body;
    const donorId = req.user._id;

    // Check if request exists and is approved
    const donationRequest = await DonationRequest.findById(requestId);
    if (!donationRequest) {
      return res.status(404).json({ message: "Donation request not found" });
    }

    if (donationRequest.status !== "approved") {
      return res.status(400).json({ message: "This request is not currently accepting donations" });
    }

    // Currency Handling and Conversion
    const donorCurrency = (currency || "INR").toUpperCase();
    const originalAmount = parseFloat(amount) || 0;
    let convertedAmountINR = originalAmount;
    let currentRate = 1;

    if (donorCurrency === "USD") {
      try {
        const response = await axios.get('https://api.frankfurter.app/latest?from=USD&to=INR');
        currentRate = response.data?.rates?.INR || 83.50; // Fallback to 83.50 if API fails
        convertedAmountINR = originalAmount * currentRate;
        console.log(`[Currency] USD to INR Live Rate: ${currentRate}`);
      } catch (error) {
        console.error("[Currency] API Error, using fallback:", error.message);
        currentRate = 83.50; // Use static fallback
        convertedAmountINR = originalAmount * currentRate;
      }
    }

    // Create donation record
    const donation = await Donation.create({
      donorId,
      requestId,
      amount: convertedAmountINR, // Store converted INR for platform consistency
      originalAmount: originalAmount,
      currency: donorCurrency.toUpperCase(),
      exchangeRate: currentRate,
      message,
      status: "success",
      transactionId: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    });

    // Check if goal is achieved (Sum only successful donations)
    const successfulDonations = await Donation.find({ requestId, status: "success" });
    const totalRaised = successfulDonations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    
    // Defensive parsing for goal amount
    const rawGoal = donationRequest.donationamount?.toString() || "0";
    const goalAmount = parseFloat(rawGoal.replace(/[^0-9.]/g, ''));

    console.log(`[GoalCheck] Request ID: ${requestId}`);
    console.log(`[GoalCheck] Patient: ${donationRequest.patientname}`);
    console.log(`[GoalCheck] Total Raised: ${totalRaised}, Goal Amount: ${goalAmount}`);

    if (!isNaN(goalAmount) && goalAmount > 0 && totalRaised >= goalAmount) {
      console.log(`[GoalCheck] Goal ACHIEVED! Updating status...`);
      donationRequest.status = "achieved";
      const updatedRequest = await donationRequest.save();
      console.log(`[GoalCheck] Status successfully updated to: ${updatedRequest.status}`);

      // Notify Admin (Wrapped in try-catch to prevent breaking the donation flow)
      try {
        await Notification.create({
          type: "goal_achieved",
          message: `Goal Achieved: The mission for ${donationRequest.patientname} has been fully funded! Target: ${goalAmount}, Total Raised: ${totalRaised}.`,
          relatedId: donationRequest._id,
          onModel: "DonationRequest"
        });
        console.log(`[GoalCheck] Admin notification created.`);
      } catch (notificationError) {
        console.error("[GoalCheck] Failed to create notification:", notificationError);
      }
    } else if (!isNaN(goalAmount) && goalAmount > 0) {
      console.log(`[GoalCheck] Goal not yet reached. Progress: ${((totalRaised/goalAmount)*100).toFixed(2)}%`);
    } else {
      console.log(`[GoalCheck] Invalid goal amount: ${rawGoal}`);
    }

    res.status(201).json({
      message: "Donation successful! Thank you for your support.",
      data: donation,
      status: donationRequest.status // Include updated status in response
    });
  } catch (error) {
    console.error("Make Donation Error:", error);
    res.status(500).json({ message: "Failed to process donation" });
  }
};

// @desc    Get donor's donation history
// @route   GET /donor/MyDonations
// @access  Private (Donor only)
const getMyDonations = async (req, res) => {
  try {
    const donorId = req.user._id;
    const donations = await Donation.find({ donorId })
      .populate("requestId", "patientname medicalproblem")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Donations fetched successfully",
      data: donations,
    });
  } catch (error) {
    console.error("Get My Donations Error:", error);
    res.status(500).json({ message: "Failed to fetch donations" });
  }
};

// @desc    Get all donations for a specific request (Admin)
// @route   GET /admin/GetRequestDonations/:id
// @access  Private (Admin only)
const getRequestDonations = async (req, res) => {
  try {
    const { id } = req.params;
    const donations = await Donation.find({ requestId: id })
      .populate("donorId", "username email mobile")
      .sort({ createdAt: -1 });

    const totalRaised = donations.reduce((sum, d) => sum + d.amount, 0);

    res.status(200).json({
      message: "Request donations fetched successfully",
      data: donations,
      summary: {
        totalRaised,
        donorCount: donations.length,
      },
    });
  } catch (error) {
    console.error("Get Request Donations Error:", error);
    res.status(500).json({ message: "Failed to fetch donations" });
  }
};

// @desc    Get all donations (Admin)
// @route   GET /admin/GetAllDonations
// @access  Private (Admin only)
const getAllDonations = async (req, res) => {
  try {
    const donations = await Donation.find({})
      .populate("donorId", "username email mobile")
      .populate("requestId", "patientname medicalproblem donationamount")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "All donations fetched successfully",
      data: donations,
    });
  } catch (error) {
    console.error("Get All Donations Error:", error);
    res.status(500).json({ message: "Failed to fetch donations" });
  }
};

module.exports = {
  makeDonation,
  getMyDonations,
  getRequestDonations,
  getAllDonations,
};
