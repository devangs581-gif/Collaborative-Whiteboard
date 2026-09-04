// Room entry screen for creating or joining a collaborative session.
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
const valid = (code) => /^[A-Za-z0-9_-]{6,32}$/.test(code);
const api =
  import.meta.env.VITE_API_URL ||
  `${import.meta.env.VITE_BACKEND_URL}/api/v1`;
const guestId = sessionStorage.getItem("wb-guest") || crypto.randomUUID();
sessionStorage.setItem("wb-guest", guestId);
export default function RoomJoin() {
  const [roomId, setRoomId] = useState("");
  const [name, setName] = useState(localStorage.getItem("wb-name") || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const enter = async (id) => {
    if (!valid(id))
      return setError("Use 6-32 letters, numbers, hyphens, or underscores.");
    setLoading(true);
    setError("");
    localStorage.setItem("wb-name", name.trim() || "Guest");
    try {
      const response = await fetch(`${api}/rooms/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomId: id,
          guestId,
          name: name.trim() || "Guest",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      navigate(`/room/${id}`);
    } catch (err) {
      setError(err.message || "Unable to open room");
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="join-page">
      <section className="join-panel">
        <div className="brand-mark">WB</div>
        <h1>Whiteboard</h1>
        <p>Sketch, decide, and collaborate in real time.</p>
        <label>
          Display name
          <input
            value={name}
            maxLength="60"
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </label>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            enter(roomId.trim());
          }}
        >
          <label>
            Room code
            <input
              value={roomId}
              maxLength="32"
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="e.g. design-sprint"
              required
            />
          </label>
          <button disabled={loading}>
            {loading ? "Opening..." : "Join room"}
          </button>
        </form>
        <button
          className="secondary"
          disabled={loading}
          onClick={() => enter(crypto.randomUUID().slice(0, 8))}
        >
          Create a new room
        </button>
        {error && <p className="error">{error}</p>}
      </section>
    </main>
  );
}
