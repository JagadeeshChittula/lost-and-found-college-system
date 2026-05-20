const http = require("http");
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { Server } = require("socket.io");
require("dotenv").config();

const User = require("./models/User");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const createChatRouter = require("./routes/chat");
const createItemsRouter = require("./routes/items");
const { getMissingCloudinaryEnvVars } = require("./config/cloudinary");
const { registerChatSocket } = require("./sockets/chatSocket");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/campus_lost_found";
const SESSION_SECRET = process.env.SESSION_SECRET || "change-this-secret";

mongoose.set("strictQuery", true);

const missingCloudinaryEnvVars = getMissingCloudinaryEnvVars();
if (missingCloudinaryEnvVars.length) {
  console.warn(
    `Cloudinary uploads are not configured. Update backend/.env values for: ${missingCloudinaryEnvVars.join(", ")}`
  );
}

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

async function ensureAdmin() {
  const existing = await User.findOne({ email: "admin@college.edu" });
  if (!existing) {
    await User.create({
      name: "Admin",
      email: "admin@college.edu",
      passwordHash: await bcrypt.hash("admin123", 10),
      isAdmin: true
    });
  }
}

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    await ensureAdmin();
    server.listen(PORT, () => {
      console.log(`MERN backend running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
