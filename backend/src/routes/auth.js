const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { currentUser } = require("../middleware/auth");
const { serializeUser } = require("../utils/serializers");

const router = express.Router();

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((err) => (err ? reject(err) : resolve()));
  });
}

router.get(
  "/me",
  asyncHandler(async (req, res) => {
    res.json({ user: serializeUser(await currentUser(req)) });
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const user = await User.findOne({ email });
    if (!user || user.blocked || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: "invalid_credentials", message: "Invalid credentials or blocked." });
    }
    req.session.userId = user._id.toString();
    await saveSession(req);
    res.json({ ok: true, user: serializeUser(user) });
  })
);

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (!name || !email || !password) {
      return res.status(400).json({ error: "invalid", message: "All fields required." });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({ name, email, passwordHash });
    res.json({ ok: true });
  })
);

router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "server_error", message: "Logout failed." });
    }
    res.json({ ok: true });
  });
});

router.use((err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  console.error("Auth route error:", err);
  if (err.code === 11000) {
    res.status(409).json({ error: "duplicate_email", message: "Email already exists." });
    return;
  }
  res.status(500).json({ error: "server_error", message: "Authentication failed. Please try again." });
});

module.exports = router;
