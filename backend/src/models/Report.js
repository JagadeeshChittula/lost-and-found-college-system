const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    message: { type: mongoose.Schema.Types.ObjectId, ref: "Message", required: true },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reason: String
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", reportSchema);
