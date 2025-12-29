const mongoose = require("mongoose");

const donationRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    patientname: {
      type: String,
      required: true,
      trim: true,
    },
    age: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
    },
    gender: {
      type: String,
      required: true,
      enum: ["male", "female", "other"],
    },
    medicalproblem: {
      type: String,
      trim: true,
    },
    medicalreport: {
      type: String, // File path or URL
      required: true,
    },
    identificationproof: {
      type: String, // File path or URL
      required: true,
    },
    number: {
      type: String,
      required: true,
      match: /^[0-9]{10}$/,
    },
    donationamount: {
      type: String,
    },
    otherproof: {
      type: String, // Optional file path or URL
    },
    overview: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "achieved"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Index for faster queries
donationRequestSchema.index({ userId: 1, status: 1 });
donationRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model("DonationRequest", donationRequestSchema);
