const mongoose = require("mongoose");
const Claim = require("../models/Claim");
const Item = require("../models/Item");
const Message = require("../models/Message");

async function canChat(user, itemId) {
  if (!user || !mongoose.isValidObjectId(itemId)) return false;
  const item = await Item.findById(itemId);
  if (!item) return false;
  if (item.owner?.toString() === user._id.toString()) return true;
  const claim = await Claim.findOne({ item: itemId }).sort({ createdAt: 1 });
  return claim?.claimer?.toString() === user._id.toString();
}

async function isSpam(userId, itemId) {
  const windowStart = new Date(Date.now() - 30 * 1000);
  const count = await Message.countDocuments({
    sender: userId,
    item: itemId,
    createdAt: { $gte: windowStart }
  });
  return count >= 5;
}

module.exports = { canChat, isSpam };
