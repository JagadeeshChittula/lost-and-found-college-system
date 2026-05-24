const http = require("http");
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const { Server } = require("socket.io");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const createChatRouter = require("./routes/chat");
const createItemsRouter = require("./routes/items");
const { getMissingCloudinaryEnvVars } = require("./config/cloudinary");
const { registerChatSocket } = require("./sockets/chatSocket");

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const MONGO_URI = process.env.MONGO_URI;
const SESSION_SECRET = process.env.SESSION_SECRET || "change-this-secret";

const missingCloudinaryEnvVars = getMissingCloudinaryEnvVars();
if (missingCloudinaryEnvVars.length) {
  console.warn(
    `Cloudinary uploads are not configured. Update backend/.env values for: ${missingCloudinaryEnvVars.join(", ")}`
  );
}

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    credentials: true
  }
});

const sessionMiddleware = session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGO_URI }),
  cookie: {
    sameSite: "lax",
    httpOnly: true
  }
});

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);

io.engine.use(sessionMiddleware);

app.use("/api", authRoutes);
app.use("/api", createItemsRouter());
app.use("/api", createChatRouter(io));
app.use("/api", adminRoutes);
registerChatSocket(io);

module.exports = { app, server };
