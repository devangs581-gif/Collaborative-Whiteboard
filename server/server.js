// Express and Socket.IO server bootstrap.

import dns from "dns";
dns.setServers(['1.1.1.1','8.8.8.8']);

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import ConnectionDB from "./db/db.js";
import mainRoute from "./routes/main.routes.js";
import { socketHandlers } from "./socket/socketHandlers.js";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

dotenv.config();
ConnectionDB();


const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: (process.env.CLIENT_URI).split(","),
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware
app.use(helmet({ crossOriginResourcePolicy: false }));

app.use(
  cors({
    origin: (process.env.CLIENT_URI).split(","),
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));

app.use(
  rateLimit({
    windowMs: 60_000,
    max: 180,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// API Routes

app.use("/api/v1", mainRoute);

// Default Route
app.get("/", (req, res) => {
  res.json({ message: "server is ready" });
});

app.use((error, _req, res, _next) => {
  console.error("Request failed", error.message);
  res.status(500).json({ error: "Unexpected server error" });
});

// Socket.IO setup
socketHandlers(io);

// Start server
const port = process.env.PORT || 8000;
server.listen(port, () => {
  console.log(`server is running at ${port}`);
});
