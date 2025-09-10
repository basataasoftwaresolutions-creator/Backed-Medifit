const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5500;

// Middleware بسيط
app.use(cors());
app.use(express.json());

// Route بسيط للتأكد من أن السيرفر يعمل
app.get("/", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "Server is running!",
    port: PORT,
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get("/health", (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  res.json({
    server: "running",
    database: dbStatus === 1 ? "connected" : "disconnected",
    dbStatus: dbStatus
  });
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || "mongodb+srv://Medifit:m7j0pADbeL4nMXk3@medifit.x3ym908.mongodb.net/?retryWrites=true&w=majority&appName=Medifit")
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err));

// Start server - هذا الجزء الأهم
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server is running on http://0.0.0.0:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}).on('error', (error) => {
  console.error("❌ Server failed to start:", error);
});