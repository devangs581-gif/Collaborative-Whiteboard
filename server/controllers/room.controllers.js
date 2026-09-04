// HTTP room lifecycle and membership-management endpoints.
import { Room } from "../models/room.models.js";

// Join or Create Room
export const joinRoom = async (req, res) => {
  const { roomId, guestId, name } = req.body;

  if (!/^[A-Za-z0-9_-]{6,32}$/.test(roomId || "")) {
    return res.status(400).json({ error: "Invalid roomId" });
  }

  try {
    let room = await Room.findOne({ roomId });
    if (!room) {
      room = await Room.create({
        roomId,
        members: [
          {
            guestId,
            name: name?.slice(0, 60) || "Guest",
            role: "OWNER",
          },
        ],
      });
    }
    const identity = guestId;
    if (
      identity &&
      !room.members.some(
        (member) => String(member.user || member.guestId) === identity,
      )
    ) {
      room.members.push({
        guestId: identity,
        name: name?.slice(0, 60) || "Guest",
        role: "MEMBER",
      });
      await room.save();
    }
    return res.status(200).json({ success: true, room });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const createRoom = async (req, res) => joinRoom(req, res);

// Get Room Info
export const getRoom = async (req, res) => {
  const { roomId } = req.params;

  try {
    const room = await Room.findOne({ roomId });
    if (!room) return res.status(404).json({ error: "Room not found" });
    return res.status(200).json({ room });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};
