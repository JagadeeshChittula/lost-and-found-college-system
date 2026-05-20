const express = require("express");
const mongoose = require("mongoose");
const Item = require("../models/Item");
const Message = require("../models/Message");
const Report = require("../models/Report");
const { requireLogin } = require("../middleware/auth");
const { canChat, isSpam } = require("../utils/chatAccess");
const { containsProfanity } = require("../utils/moderation");
const { sendEmail } = require("../utils/mail");

function createChatRouter(io) {
  const router = express.Router();

  router
    .route("/chat/messages")
    .get(requireLogin, async (req, res) => {
      const itemId = req.query.item_id;
      if (!itemId) return res.json({ messages: [] });
      if (!(await canChat(req.user, itemId))) return res.status(403).json({ error: "not_allowed" });
      const messages = await Message.find({ item: itemId }).populate("sender", "name").sort({ createdAt: 1 });
      res.json({
        messages: messages.map((message) => ({
          id: message._id.toString(),
          item_id: message.item.toString(),
          sender_id: message.sender?._id?.toString(),
          sender_name: message.sender?.name || "",
          body: message.body,
          created_at: message.createdAt?.toISOString()
        }))
      });
    })
    .post(requireLogin, async (req, res) => {
      if (req.user.muted) return res.status(403).json({ error: "muted" });
      const itemId = req.body.item_id;
      const body = String(req.body.body || "").trim();
      if (!mongoose.isValidObjectId(itemId) || !body) return res.status(400).json({ error: "invalid" });
      if (!(await canChat(req.user, itemId))) return res.status(403).json({ error: "not_allowed" });
      if (containsProfanity(body)) return res.status(400).json({ error: "profanity_detected" });
      if (await isSpam(req.user._id, itemId)) return res.status(429).json({ error: "spam_detected" });

      const message = await Message.create({ item: itemId, sender: req.user._id, body });
      const item = await Item.findById(itemId);
      if (item?.email && item.owner?.toString() !== req.user._id.toString()) {
        await sendEmail(item.email, "New message about your item", "You received a new chat message. Please login to view and respond.");
      }
      io.to(`item-${itemId}`).emit("message", {
        id: message._id.toString(),
        item_id: itemId,
        sender: req.user.name,
        body
      });
      res.json({ ok: true, id: message._id.toString() });
    });

  router.post("/chat/report", requireLogin, async (req, res) => {
    const messageId = req.body.message_id;
    const reason = req.body.reason || "Reported";
    if (!mongoose.isValidObjectId(messageId)) return res.status(400).json({ error: "invalid" });
    await Report.create({ message: messageId, reporter: req.user._id, reason });
    res.json({ ok: true });
  });

  return router;
}

module.exports = createChatRouter;
