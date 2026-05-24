const express = require("express");
const mongoose = require("mongoose");
const Claim = require("../models/Claim");
const Item = require("../models/Item");
const { currentUser, requireLogin } = require("../middleware/auth");
const { requireCloudinaryConfig, upload } = require("../middleware/upload");
const { containsProfanity } = require("../utils/moderation");
const { serializeItem } = require("../utils/serializers");
const { sendEmail } = require("../utils/mail");
const { getUploadedImageUrl } = require("../utils/cloudinaryImage");

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function createItemsRouter() {
  const router = express.Router();

  router
    .route("/items")
    .get(asyncHandler(async (req, res) => {
      const user = await currentUser(req);
      const q = String(req.query.q || "").trim();
      const type = String(req.query.type || "all");
      const filter = {};
      if (["lost", "found"].includes(type)) filter.type = type;
      if (q) filter.$or = [{ name: new RegExp(q, "i") }, { description: new RegExp(q, "i") }];

      const items = await Item.find(filter).populate("owner", "name").sort({ createdAt: -1 });
      const claimMap = new Map();
      await Promise.all(
        items.map(async (item) => {
          const claim = await Claim.findOne({ item: item._id }).sort({ createdAt: 1 });
          claimMap.set(item._id.toString(), claim);
        })
      );
      res.json({ items: items.map((item) => serializeItem(item, user, claimMap.get(item._id.toString()))) });
    }))
    .post(requireLogin, requireCloudinaryConfig, upload.single("image"), asyncHandler(async (req, res) => {
      const itemType = req.body.type;
      const name = String(req.body.name || "").trim();
      const contact = String(req.body.contact || "").trim();
      const email = String(req.body.email || "").trim();
      const description = String(req.body.description || "").trim();
      const itemDate = String(req.body.item_date || "").trim();
      if (!["lost", "found"].includes(itemType) || !name || !contact) {
        return res.status(400).json({ error: "invalid" });
      }
      if (containsProfanity(name) || containsProfanity(description)) {
        return res.status(400).json({ error: "profanity_detected" });
      }

      let imageUrl = "";
      if (req.file) {
        imageUrl = getUploadedImageUrl(req.file);
        if (!imageUrl) {
          return res.status(500).json({
            error: "cloudinary_upload_failed",
            message: "Image was uploaded but no Cloudinary link was returned. Check your Cloudinary credentials."
          });
        }
      }

      const item = await Item.create({
        type: itemType,
        name,
        contact,
        email,
        description,
        itemDate,
        owner: req.user._id,
        imageUrl
      });
      res.json({ ok: true, imageUrl: item.imageUrl || "" });
    }));

  router.post("/claim", requireLogin, asyncHandler(async (req, res) => {
    const itemId = req.body.item_id;
    if (!mongoose.isValidObjectId(itemId)) return res.status(400).json({ error: "invalid" });
    const existing = await Claim.findOne({ item: itemId }).sort({ createdAt: 1 });
    if (existing) {
      if (existing.claimer.toString() === req.user._id.toString()) return res.json({ ok: true });
      return res.status(409).json({ error: "already_claimed" });
    }
    await Claim.create({ item: itemId, claimer: req.user._id });
    const item = await Item.findById(itemId);
    if (item?.email) {
      await sendEmail(
        item.email,
        "Someone claimed your item",
        `A user has claimed item #${itemId}. Please login to chat and verify ownership.`
      );
    }
    res.json({ ok: true });
  }));

  router.use((err, _req, res, next) => {
    if (res.headersSent) {
      next(err);
      return;
    }

    if (err.name === "MulterError") {
      res.status(400).json({
        error: "invalid_image_upload",
        message: err.code === "LIMIT_FILE_SIZE" ? "Image must be 5MB or smaller." : "Please upload a valid image file."
      });
      return;
    }

    console.error("Items route error:", err);
    res.status(500).json({ error: "server_error", message: "Something went wrong while processing the item." });
  });

  return router;
}

module.exports = createItemsRouter;
