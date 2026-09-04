// Authoritative Socket.IO room, collaboration, and persistence handlers.
import { Room } from "../models/room.models.js";
import { validDrawingObject, validRoomId } from "../utils/validation.js";

const roomUsers = new Map();
const colors = [
  "#2563eb",
  "#dc2626",
  "#059669",
  "#9333ea",
  "#d97706",
  "#0891b2",
];
const canEdit = (role) => ["OWNER", "MEMBER"].includes(role);

export const socketHandlers = (io) => {
  io.use((socket, next) => {
    socket.guestId = socket.handshake.auth?.guestId || socket.id;
    socket.displayName = String(socket.handshake.auth?.name || "Guest").slice(0, 60);
    next();
  });

  io.on("connection", (socket) => {
    //This function works when client emits room:join it add the user into the room
    //And send the notification to all the members into the room. Here we send 3 types of notification
    socket.on("room:join", async ({ roomId }, done = () => {}) => {

      try {
        if (!validRoomId(roomId)) throw new Error("Invalid room ID");

        const room = await Room.findOne({ roomId });

        if (!room) throw new Error("Room not found");

        const identity = socket.guestId;

        let member = room.members.find(
          (item) => item.guestId === identity,
        );

        //If member is not present then we add into our room member array
        if (!member) {
          member = {
            guestId: identity,
            name: socket.displayName,
            avatar: "",
            role: "MEMBER",
          };
          room.members.push(member);
          await room.save();
        }

        socket.roomId = roomId;
        socket.member = member;

        socket.join(roomId);

        if (!roomUsers.has(roomId)) roomUsers.set(roomId, new Map());

        //For every person in that room I assign socket.id as a key and value pair for every user
        roomUsers
          .get(roomId)
          .set(socket.id, {
            id: identity,
            name: member.name,
            avatar: member.avatar,
            role: member.role,
            color: colors[roomUsers.get(roomId).size % colors.length],
          });

        //In this we broadcast the message to all of the users 
        io.to(roomId).emit("presence:update", [
          ...roomUsers.get(roomId).values(),
        ]);
        
        //This will run when client side emit whiteboard:sync and here 
        // we set objects and members
        socket.emit("whiteboard:sync", {
          objects: room.drawingData,
          members: room.members.map((item) => ({
            id: item.guestId,
            name: item.name,
            avatar: item.avatar,
            role: item.role,
          })),
        });

        socket
          .to(roomId)
          .emit("activity", {
            message: `${member.name} joined the room`,
            at: Date.now(),
          });
        done({ ok: true, role: member.role });
      } catch (error) {
        done({ ok: false, error: error.message });
      }
    });

    socket.on(
      "whiteboard:operation",
      async ({ operation }, done = () => {}) => {
        try {
          if (!socket.roomId || !canEdit(socket.member?.role))
            throw new Error("You do not have permission to edit this room");
          if (
            !operation ||
            !["create", "update", "delete", "clear", "replace"].includes(
              operation.type,
            )
          )
            throw new Error("Invalid operation");

          const room = await Room.findOne({ roomId: socket.roomId });

          if (!room) throw new Error("Room not found");
          // Clear is a board-level edit, so every existing editable role may use it.
          // VIEWER is still rejected by the canEdit check above.
          if (
            (operation.type === "create" || operation.type === "update") &&
            !validDrawingObject(operation.object)
          )
            throw new Error("Invalid drawing object");

          const existingObject =
            operation.type === "update" || operation.type === "delete"
              ? room.drawingData.find(
                  (item) => item.id === (operation.object?.id || operation.id),
                )
              : null;
          if (
            (operation.type === "update" || operation.type === "delete") &&
            !existingObject
          )
            throw new Error("Object not found");
          if (
            (operation.type === "update" || operation.type === "delete") &&
            operation.baseRevision !== (existingObject.revision || 0)
          ) {
            const error = new Error("Object was changed by another user");
            error.currentObject = existingObject.toObject();
            throw error;
          }
          if (operation.type === "delete" && typeof operation.id !== "string")
            throw new Error("Invalid object ID");
          if (
            operation.type === "replace" &&
            (!Array.isArray(operation.objects) ||
              operation.objects.length > 5000 ||
              !operation.objects.every(validDrawingObject))
          )
            throw new Error("Invalid whiteboard state");
          if (operation.type === "create") {
            if (
              room.drawingData.some((item) => item.id === operation.object.id)
            )
              throw new Error("Object ID already exists");
            operation.object = { ...operation.object, revision: 1 };
            room.drawingData.push(operation.object);
          }
          if (operation.type === "update") {
            operation.object = {
              ...operation.object,
              revision: (existingObject.revision || 0) + 1,
            };
            room.drawingData = room.drawingData.map((item) =>
              item.id === operation.object.id ? operation.object : item,
            );
          }
          if (operation.type === "delete")
            room.drawingData = room.drawingData.filter(
              (item) => item.id !== operation.id,
            );
          if (operation.type === "clear") room.drawingData = [];
          if (operation.type === "replace")
            room.drawingData = operation.objects;
          room.lastActivity = new Date();
          await room.save();
          // The initiating client has already applied its optimistic operation. Sending it
          // back would duplicate creates, while every other room member needs the update.
          socket
            .to(socket.roomId)
            .emit("whiteboard:operation", {
              operation,
              by: socket.displayName,
            });
            
          io.to(socket.roomId).emit("activity", {
            message: `${socket.displayName} ${operation.type === "clear" ? "cleared the board" : `${operation.type}d an object`}`,
            at: Date.now(),
          });
          done({ ok: true, operation });
        } catch (error) {
          done({
            ok: false,
            error: error.message,
            currentObject: error.currentObject,
          });
        }
      },
    );

    socket.on("cursor:update", (cursor) => {
      if (
        !socket.roomId ||
        !Number.isFinite(cursor?.x) ||
        !Number.isFinite(cursor?.y)
      )
        return;
      socket
        .to(socket.roomId)
        .emit("cursor:update", {
          id: socket.id,
          name: socket.displayName,
          color: roomUsers.get(socket.roomId)?.get(socket.id)?.color,
          x: cursor.x,
          y: cursor.y,
        });
    });

    socket.on("disconnect", () => {
      if (!socket.roomId) return;
      const users = roomUsers.get(socket.roomId);
      users?.delete(socket.id);
      if (!users?.size) roomUsers.delete(socket.roomId);
      else io.to(socket.roomId).emit("presence:update", [...users.values()]);
      socket.to(socket.roomId).emit("cursor:remove", { id: socket.id });
      socket
        .to(socket.roomId)
        .emit("activity", {
          message: `${socket.displayName} left the room`,
          at: Date.now(),
        });
    });
  });
};
