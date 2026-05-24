const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("./models/User");
const { createApplication } = require("./app");

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

if (!MONGO_URI) {
  console.error("MONGO_URI is not set. Add it in Render environment variables.");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 })
  .then(async () => {
    await ensureAdmin();
    const { server } = createApplication();
    server.listen(PORT, () => {
      const mode = process.env.NODE_ENV || "development";
      console.log(`Server listening on port ${PORT} (${mode})`);
      console.log(`CLIENT_URL=${process.env.CLIENT_URL || process.env.RENDER_EXTERNAL_URL || "(not set)"}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
