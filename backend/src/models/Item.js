const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["lost", "found"], required: true },
    name: { type: String, required: true },
    contact: { type: String, required: true },
    email: String,
    description: String,
    itemDate: String,
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: { type: String, default: "open" },
    imageUrl: String
  },
  { timestamps: true }
);

module.exports = mongoose.model("Item", itemSchema);
