const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const { initStatusScheduler } = require("./utils/statusScheduler");

dotenv.config();

const app = express();

// --- CORS Configuration ---
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://givingisdivine.com",
  "https://www.givingisdivine.com"
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

// Enable CORS for all routes including preflight
app.use(cors(corsOptions));

// --- Middleware ---
// Special handling for Stripe Webhook (must be before express.json)
// app.use("/payment/webhook", express.raw({ type: "application/json" }), require("./controllers/paymentController").handleWebhook);

app.use(express.json());

// Serve static files (uploaded files)
app.use("/uploads", express.static("uploads"));

// --- MongoDB Connection ---
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ DB connected");
    initStatusScheduler();
  })
  .catch((err) => {
    console.error("❌ DB connection error:", err);
  });

// --- Test Route ---
app.get("/", (req, res) => {
  res.send("<h2>🚀 API is running successfully!</h2>");
});
  
// --- API Routes ---
app.use("/payment", require("./routes/paymentRoutes"));
app.use("/", require("./routes/authRoutes"));
app.use("/receiver", require("./routes/receiverRoutes"));
app.use("/admin", require("./routes/adminRoutes"));
app.use("/Home", require("./routes/homeRoutes"));
app.use("/donor", require("./routes/donorRoutes"));
app.use("/contact", require("./routes/contactRoutes"));

// --- 404 Not Found Handler ---     
app.use((req, res, next) => {
  res.status(404).json({ error: "Route not found" });
});

// --- Global Error Handler ---
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err.stack);
  res
    .status(500)
    .json({ error: "Something went wrong! Please try again later." });
});

// --- Start Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
        