const express = require("express");
const Claim = require("../models/Claim");
const Item = require("../models/Item");
const Message = require("../models/Message");
const Report = require("../models/Report");
const User = require("../models/User");
const { requireAdmin } = require("../middleware/auth");
const { serializeItem, serializeUser } = require("../utils/serializers");

const router = express.Router();

router.use(requireAdmin);

router.get("/admin/summary", async (_req, res) => {
  const [users_count, items_count, claims_count, reports_count] = await Promise.all([
    User.countDocuments(),
    Item.countDocuments(),
    Claim.countDocuments(),
    Report.countDocuments()
  ]);
  res.json({ users_count, items_count, claims_count, reports_count });
});

router.get("/admin/users", async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ users: users.map(serializeUser) });
});

router.get("/admin/items", async (req, res) => {
  const filter = {};
  if (req.query.start_date || req.query.end_date) filter.itemDate = {};
  if (req.query.start_date) filter.itemDate.$gte = String(req.query.start_date);
  if (req.query.end_date) filter.itemDate.$lte = String(req.query.end_date);
  const items = await Item.find(filter).sort({ createdAt: -1 });
  res.json({ items: items.map((item) => serializeItem(item, null, null)) });
});

router.get("/admin/claims", async (_req, res) => {
  const claims = await Claim.find().populate("item", "name").populate("claimer", "name").sort({ createdAt: -1 });
  res.json({
    claims: claims.map((claim) => ({
      id: claim._id.toString(),
      item_name: claim.item?.name || "",
      claimer_name: claim.claimer?.name || "",
      status: claim.status
    }))
  });
});

router.get("/admin/reports", async (_req, res) => {
  const reports = await Report.find().populate("message", "body").populate("reporter", "name").sort({ createdAt: -1 });
  res.json({
    reports: reports.map((report) => ({
      id: report._id.toString(),
      message_id: report.message?._id?.toString(),
      message_body: report.message?.body || "",
      reporter_name: report.reporter?.name || "",
      reason: report.reason || ""
    }))
  });
});

router.post("/admin/block_user", async (req, res) => {
  await User.findByIdAndUpdate(req.body.user_id, { blocked: true });
  res.json({ ok: true });
});

router.post("/admin/mute_user", async (req, res) => {
  await User.findByIdAndUpdate(req.body.user_id, { muted: true });
  res.json({ ok: true });
});

router.post("/admin/unmute_user", async (req, res) => {
  await User.findByIdAndUpdate(req.body.user_id, { muted: false });
  res.json({ ok: true });
});

router.post("/admin/delete_item", async (req, res) => {
  const itemId = req.body.item_id;
  await Promise.all([
    Item.findByIdAndDelete(itemId),
    Claim.deleteMany({ item: itemId }),
    Message.deleteMany({ item: itemId })
  ]);
  res.json({ ok: true });
});

router.post("/admin/delete_message", async (req, res) => {
  const messageId = req.body.message_id;
  const report = await Report.findOne({ message: messageId });
  if (!report) return res.status(403).json({ error: "forbidden" });
  await Promise.all([Message.findByIdAndDelete(messageId), Report.deleteMany({ message: messageId })]);
  res.json({ ok: true });
});

module.exports = router;
