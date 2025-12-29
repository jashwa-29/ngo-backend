const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("./models/User");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("DB Connection Failed:", error);
    process.exit(1);
  }
};

const createAdmin = async () => {
  try {
    await connectDB();

    const adminExists = await User.findOne({ role: "ADMIN" });

    if (adminExists) {
      console.log("Admin already exists");
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("Admin@123", salt);

    const admin = await User.create({
      username: "Admin",
      email: "admin@gmail.com",
      mobile: "9999999999",
      address: "Admin Address",
      password: hashedPassword,
      role: "ADMIN",
    });

    console.log("✅ Admin created successfully");
    console.log({
      email: admin.email,
      password: "Admin@123",
      role: admin.role,
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin:", error.message);
    process.exit(1);
  }
};

createAdmin();
