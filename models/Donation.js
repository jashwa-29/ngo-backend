const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema(
  {
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DonationRequest",
      required: true,
    },
    amount: {
      type: Number, // This will be the converted INR amount
      required: true,
      min: 0,
    },
    originalAmount: {
      type: Number, // The amount in the donor's chosen currency
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
    },
    exchangeRate: {
      type: Number,
      default: 1, // Rate to convert originalAmount to INR
    },
    transactionId: {
      type: String,
      unique: true,
      sparse: true, // Allow multiple nulls if transaction is just started
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      default: "Direct",
    },
    message: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Add index for fast querying
donationSchema.index({ donorId: 1 });
donationSchema.index({ requestId: 1 });
donationSchema.index({ status: 1 });

module.exports = mongoose.model("Donation", donationSchema);
