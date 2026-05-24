const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("./models/User");
const { server } = require("./app");

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.set("strictQuery", true);

async function ensureAdmin() {
  const existing = await User.findOne({ email: "admin@college.edu" });
  if (!existing) {
    await User.create({
      name: "Admin",
      email: "admin@college.edu",
      passwordHash: await bcrypt.hash("admin123", 10),
      isAdmin: true
    });
  }
}

mongoose
  .connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 })
  .then(async () => {
    await ensureAdmin();
    server.listen(PORT, () => {
      console.log(`MERN backend running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
