// Express routes for guest room APIs.
import express from "express";
import { joinRoom, getRoom, createRoom } from "../controllers/room.controllers.js";

const router = express.Router();

router.post("/rooms", createRoom);
router.post("/rooms/join", joinRoom);

// @route   GET /api/v1/rooms/:roomId
router.get("/rooms/:roomId", getRoom);
export default router;
