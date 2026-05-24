const fs = require("fs");
const http = require("http");
const path = require("path");
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

const isProduction = process.env.NODE_ENV === "production";
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

if (isProduction) {
  app.set("trust proxy", 1);
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
    secure: isProduction,
    httpOnly: true
  }
});

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);

io.engine.use(sessionMiddleware);

app.get("/api/health", (_req, res) => {
  const distPath = path.join(process.cwd(), "frontend/dist");
  const indexFile = path.join(distPath, "index.html");
  res.json({
    ok: true,
    frontendBuilt: fs.existsSync(indexFile),
    distPath
  });
});

app.use("/api", authRoutes);
app.use("/api", createItemsRouter());
app.use("/api", createChatRouter(io));
app.use("/api", adminRoutes);
registerChatSocket(io);

if (isProduction) {
  const distPath = path.join(process.cwd(), "frontend/dist");
  const indexFile = path.join(distPath, "index.html");

  if (!fs.existsSync(indexFile)) {
    console.error(`Production frontend missing at ${indexFile}. Run: npm run build`);
  } else {
    console.log(`Serving frontend from ${distPath}`);
  }

  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) {
      next();
      return;
    }
    if (!fs.existsSync(indexFile)) {
      res.status(503).send("Frontend build not found. Redeploy with npm run build.");
      return;
    }
    res.sendFile(indexFile, (err) => {
      if (err) {
        console.error("SPA fallback error:", err);
        res.status(500).send("Unable to load app.");
      }
    });
  });
}

app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  if (!res.headersSent) {
    res.status(500).json({ error: "server_error", message: "Internal server error." });
  }
});

module.exports = { app, server };
