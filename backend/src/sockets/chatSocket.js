const User = require("../models/User");
const { canChat } = require("../utils/chatAccess");

function registerChatSocket(io) {
  io.on("connection", (socket) => {
    socket.on("join", async (data) => {
      const user = await User.findById(socket.request.session?.userId);
      const itemId = data?.item_id;
      if (itemId && user && (await canChat(user, itemId))) {
        socket.join(`item-${itemId}`);
        socket.emit("status", { message: "joined" });
      } else {
        socket.emit("status", { message: "not_allowed" });
      }
    });

    socket.on("leave", (data) => {
      if (data?.item_id) socket.leave(`item-${data.item_id}`);
      socket.emit("status", { message: "left" });
    });
  });
}

module.exports = { registerChatSocket };
