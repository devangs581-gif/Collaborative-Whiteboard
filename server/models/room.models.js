// MongoDB schemas for rooms, members, and persisted drawing objects.
import mongoose, { model } from "mongoose";

const DrawingObjectSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    revision: { type: Number, default: 0, min: 0 },
    type: {
      type: String,
      enum: ["pencil", "line", "rectangle", "circle", "arrow", "text"],
      required: true,
    },
    x: Number,
    y: Number,
    width: Number,
    height: Number,
    points: [{ x: Number, y: Number }],
    text: { type: String, maxlength: 2000 },
    strokeColor: { type: String, default: "#172033" },
    fillColor: { type: String, default: "transparent" },
    strokeWidth: { type: Number, default: 2, min: 1, max: 40 },
    fontSize: { type: Number, default: 18, min: 8, max: 120 },
    fontFamily: { type: String, default: "Arial" },
  },
  { _id: false },
);

const MemberSchema = new mongoose.Schema(
  {
    guestId: { type: String, required: true },
    name: { type: String, required: true },
    avatar: String,
    role: {
      type: String,
      enum: ["OWNER", "MEMBER"],
      default: "MEMBER",
    },
  },
  { _id: false },
);

const RoomSchema = new mongoose.Schema(
  {
    roomId: {
      required: true,
      type: String,
      unique: true,
    },
    members: { type: [MemberSchema], default: [] },
    lastActivity: {
      type: Date,
      default: Date.now,
    },

    drawingData: {
      type: [DrawingObjectSchema],
      default: [],
    },
  },
  { timestamps: true },
);
RoomSchema.index({ roomId: 1 }, { unique: true });
export const Room = mongoose.model("Room", RoomSchema);
