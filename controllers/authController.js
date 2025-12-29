const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/email");
const crypto = require("crypto");

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "default_secret_key", {
    expiresIn: "30d",
  });
};

// @desc    Register new user
// @route   POST /Register
// @access  Public
const registerUser = async (req, res) => {
  try {
    // Frontend sends: username, mail, mobile, address, password, role
    // Note: receiving 'mail', saving as 'email'
    const { username, mail, mobile, address, password, role } = req.body;

    if (!username || !mail || !password || !mobile || !address || !role) {
      return res.status(400).json({ message: "Please add all fields" });
    }

    // Check if user exists
    const userExists = await User.findOne({ email: mail });

    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      username,
      email: mail, // Map mail to email
      mobile,
      address,
      password: hashedPassword,
      role,
    });

    if (user) {
      res.status(201).json({
        _id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Authenticate a user
// @route   POST /login
// @access  Public
const loginUser = async (req, res) => {
  try {
    // Frontend sends: username (which is email), password
    const { username, password } = req.body;
    
    // Check for user email
    // Since frontend sends email in 'username' field
    const user = await User.findOne({ email: username });

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        userid: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Forgot Password - Send OTP
// @route   POST /forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Please provide an email" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "No user found with that email" });
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Set OTP and expiry (10 minutes)
    user.resetPasswordOTP = otp;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;

    await user.save();

    // Send Email
    try {
      await sendEmail({
        email: user.email,
        subject: "Password Reset OTP",
        message: `Your OTP for password reset is: ${otp}. It expires in 10 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #4D9186;">Password Reset Request</h2>
            <p>Hello ${user.username},</p>
            <p>You requested a password reset. Use the OTP below to complete the process:</p>
            <div style="font-size: 24px; font-weight: bold; color: #4D9186; padding: 10px; background: #f9f9f9; border-radius: 5px; text-align: center; margin: 20px 0;">
              ${otp}
            </div>
            <p>This OTP will expire in 10 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee;" />
            <p style="font-size: 12px; color: #888;">Swiflare NGO Platform</p>
          </div>
        `,
      });

      res.status(200).json({ message: "OTP sent to email" });
    } catch (err) {
      user.resetPasswordOTP = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      console.error("Email Error:", err);
      return res.status(500).json({ message: "Error sending email. Please try again later." });
    }
  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Reset Password
// @route   POST /reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Please provide all fields" });
    }

    const user = await User.findOne({ 
      email, 
      resetPasswordOTP: otp,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // Clear OTP fields
    user.resetPasswordOTP = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
};
