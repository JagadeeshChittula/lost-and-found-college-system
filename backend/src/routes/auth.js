const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { currentUser } = require("../middleware/auth");
const { serializeUser } = require("../utils/serializers");

const router = express.Router();

router.get("/me", async (req, res) => {
  res.json({ user: serializeUser(await currentUser(req)) });
});

router.post("/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const user = await User.findOne({ email });
  if (!user || user.blocked || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid credentials or blocked." });
  }
  req.session.userId = user._id.toString();
  res.json({ ok: true, user: serializeUser(user) });
});

router.post("/register", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (!name || !email || !password) return res.status(400).json({ error: "All fields required." });
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({ name, email, passwordHash });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: "Email already exists." });
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

module.exports = router;
