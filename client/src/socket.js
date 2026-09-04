// Singleton Socket.IO client shared by all whiteboard components.
import { io } from "socket.io-client";

let socket;
const guestId = sessionStorage.getItem("wb-guest") || crypto.randomUUID();
sessionStorage.setItem("wb-guest", guestId);

export const getSocket = () => {
  if (!socket)
    socket = io(import.meta.env.VITE_BACKEND_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      auth: {
        guestId,
        name: localStorage.getItem("wb-name") || "Guest",
      },
    });
  return socket;
};
