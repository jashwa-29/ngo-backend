const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Donation = require("../models/Donation");
const DonationRequest = require("../models/DonationRequest");
const Notification = require("../models/Notification");
const User = require("../models/User");
const sendEmail = require("../utils/email");

// @desc    Create a Payment Intent
// @route   POST /payment/create-intent
// @access  Private
const createPaymentIntent = async (req, res) => {
  try {
    const { requestId, amount, currency, message } = req.body;
    const donorId = req.user._id;

    // Validate request
    const donationRequest = await DonationRequest.findById(requestId);
    if (!donationRequest) {
      return res.status(404).json({ message: "Donation request not found" });
    }

    if (donationRequest.status !== "approved") {
      return res.status(400).json({ message: "This request is not currently accepting donations" });
    }

    // Convert amount to cents/smallest unit for Stripe
    // For INR/USD, stripe expects amount in smallest unit (paise/cents)
    const stripeAmount = Math.round(parseFloat(amount) * 100);

    // Create a pending donation record
    const donation = await Donation.create({
      donorId,
      requestId,
      amount: 0, // Will be updated on success (converted to INR)
      originalAmount: amount,
      currency: currency.toUpperCase(),
      message,
      status: "pending",
      transactionId: `PEND-${Date.now()}`,
    });

    // Get donor information for Indian regulations
    const donor = await User.findById(donorId);
    
    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: stripeAmount,
      currency: currency.toLowerCase(),
      description: `Donation for ${donationRequest.patientname} - Medical Support`,
      shipping: {
        name: donor?.name || "Anonymous Donor",
        address: {
          line1: "Address not provided",
          city: "City",
          state: "State",
          postal_code: "000000",
          country: "IN",
        },
      },
      metadata: {
        donationId: donation._id.toString(),
        requestId: requestId.toString(),
        donorId: donorId.toString(),
      },
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      donationId: donation._id,
    });
  } catch (error) {
    console.error("Create Payment Intent Error:", error);
    res.status(500).json({ message: "Failed to initialize payment" });
  }
};

// @desc    Handle Stripe Webhooks
// @route   POST /payment/webhook
// @access  Public
const handleWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const { donationId, requestId, donorId } = paymentIntent.metadata;

        try {
            const donation = await Donation.findById(donationId);
            if (!donation) {
                console.error("Donation record not found for webhook");
                return res.status(404).json({ message: "Donation record not found" });
            }

            if (donation.status === 'success') {
                return res.status(200).json({ received: true });
            }

            // Perform conversion if it's not INR
            let convertedAmountINR = donation.originalAmount;
            let currentRate = 1;

            if (donation.currency === "USD") {
                const axios = require("axios");
                try {
                    const response = await axios.get('https://api.frankfurter.app/latest?from=USD&to=INR');
                    currentRate = response.data?.rates?.INR || 83.50;
                    convertedAmountINR = donation.originalAmount * currentRate;
                } catch (error) {
                    currentRate = 83.50;
                    convertedAmountINR = donation.originalAmount * currentRate;
                }
            }

            // Update donation record
            donation.status = "success";
            donation.transactionId = paymentIntent.id;
            donation.amount = convertedAmountINR;
            donation.exchangeRate = currentRate;
            await donation.save();

            // Update Donation Request and check goal
            const donationRequest = await DonationRequest.findById(requestId);
            if (donationRequest) {
                const successfulDonations = await Donation.find({ requestId, status: "success" });
                const totalRaised = successfulDonations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
                
                const rawGoal = donationRequest.donationamount?.toString() || "0";
                const goalAmount = parseFloat(rawGoal.replace(/[^0-9.]/g, ''));

                if (!isNaN(goalAmount) && goalAmount > 0 && totalRaised >= goalAmount) {
                    donationRequest.status = "achieved";
                    await donationRequest.save();

                    await Notification.create({
                        type: "goal_achieved",
                        message: `Goal Achieved: The mission for ${donationRequest.patientname} has been fully funded!`,
                        relatedId: donationRequest._id,
                        onModel: "DonationRequest"
                    });
                }
            }

            // Send Thank You Email to Donor
            try {
                const donor = await User.findById(donorId);
                const donationRequest = await DonationRequest.findById(requestId);
                
                if (donor && donor.email) {
                    const emailHtml = `
                        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #f0f0f0; border-radius: 20px;">
                            <div style="text-align: center; margin-bottom: 30px;">
                                <div style="display: inline-block; padding: 20px; background-color: #4D9186; border-radius: 20px;">
                                    <h1 style="color: white; margin: 0; font-size: 24px;">SWIFLARE NGO</h1>
                                </div>
                            </div>
                            
                            <h2 style="color: #333; text-align: center; font-size: 28px; margin-bottom: 10px;">Glorious Impact!</h2>
                            <p style="color: #666; text-align: center; font-size: 16px; margin-bottom: 30px;">Your generosity has been successfully received.</p>
                            
                            <div style="background-color: #f9f9f9; padding: 30px; border-radius: 20px; margin-bottom: 30px;">
                                <p style="margin: 0 0 10px 0; color: #999; text-transform: uppercase; font-size: 12px; font-weight: bold; letter-spacing: 1px;">Donation Summary</p>
                                <h3 style="margin: 0; color: #333; font-size: 20px;">${donation.currency} ${donation.originalAmount}</h3>
                                <div style="margin: 20px 0; border-top: 1px dashed #ddd;"></div>
                                <p style="margin: 0; color: #666;"><strong>Supported Cause:</strong> ${donationRequest?.patientname || 'Medical Support'}</p>
                                <p style="margin: 5px 0 0 0; color: #666;"><strong>Transaction ID:</strong> ${paymentIntent.id}</p>
                            </div>
                            
                            <p style="color: #666; line-height: 1.6; font-size: 15px;">
                                Hi ${donor.username},<br><br>
                                On behalf of Swiflare NGO and the families we serve, we want to express our deepest gratitude for your contribution. Your support directly helps in providing critical medical aid to those in need.
                            </p>
                            
                            <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 1px solid #eee;">
                                <p style="color: #999; font-size: 12px;">This is an automated confirmation of your donation.</p>
                                <p style="color: #4D9186; font-weight: bold; font-size: 14px;">Together, we make a difference.</p>
                            </div>
                        </div>
                    `;

                    await sendEmail({
                        email: donor.email,
                        subject: "Thank You for Your Generous Donation! - Swiflare NGO",
                        html: emailHtml
                    });
                    console.log(`Thank you email sent to ${donor.email}`);
                }
            } catch (emailErr) {
                console.error("Failed to send thank you email:", emailErr);
            }

            console.log(`Donation ${donationId} marked as success`);
        } catch (error) {
            console.error("Webhook processing error:", error);
            return res.status(500).json({ message: "Internal server error during webhook" });
        }
    }

    res.json({ received: true });
};

module.exports = {
  createPaymentIntent,
  handleWebhook,
};
