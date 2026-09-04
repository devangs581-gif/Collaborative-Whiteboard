// Coordinates room state, optimistic operations, and the fixed drawing canvas.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DrawingCanvas from "./DrawingCanvas";
import Toolbar from "./Toolbar";
import { getSocket } from "../socket";

const apply = (items, op) =>
  op.type === "create"
    ? items.some((item) => item.id === op.object.id)
      ? items.map((item) => (item.id === op.object.id ? op.object : item))
      : [...items, op.object]
    : op.type === "update"
      ? items.map((item) =>
          item.id === op.object.id
            ? (item.revision || 0) > (op.object.revision || 0)
              ? item
              : op.object
            : item,
        )
      : op.type === "delete"
        ? items.filter((item) => item.id !== op.id)
        : op.type === "clear"
          ? []
          : op.type === "replace"
            ? op.objects
            : items;

export default function Whiteboard() {
  const { roomId } = useParams();
  const socket = useMemo(getSocket, []);
  const navigate = useNavigate();
  const [objects, setObjects] = useState([]);
  const objectsRef = useRef([]);
  const [tool, setTool] = useState("select");
  const [style, setStyle] = useState({ color: "#172033", strokeWidth: 3 });
  const [selectedId, setSelectedId] = useState(null);
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState(
    socket.connected ? "Connected" : "Connecting",
  );
  const [message, setMessage] = useState("");
  const [activities, setActivities] = useState([]);
  const canvas = useRef();

  const commit = (operation) => {
    const before = objectsRef.current;
    const targetId = operation.object?.id || operation.id;
    const current = before.find((item) => item.id === targetId);
    const outbound = ["update", "delete"].includes(operation.type)
      ? { ...operation, baseRevision: current?.revision || 0 }
      : operation;
    const after = apply(before, operation);
    objectsRef.current = after;
    setObjects(after);
    socket.emit("whiteboard:operation", { operation: outbound }, (response) => {
      if (response?.ok && response.operation?.object) {
        objectsRef.current = objectsRef.current.map((item) =>
          item.id === response.operation.object.id
            ? response.operation.object
            : item,
        );
        setObjects(objectsRef.current);
        return;
      }
      if (!response?.ok) {
        if (response?.currentObject) {
          const exists = objectsRef.current.some(
            (item) => item.id === response.currentObject.id,
          );
          objectsRef.current = exists
            ? objectsRef.current.map((item) =>
                item.id === response.currentObject.id
                  ? response.currentObject
                  : item,
              )
            : [...objectsRef.current, response.currentObject];
          setObjects(objectsRef.current);
        } else if (operation.type === "create") {
          objectsRef.current = objectsRef.current.filter(
            (item) => item.id !== operation.object.id,
          );
          setObjects(objectsRef.current);
        } else if (operation.type === "clear") {
          objectsRef.current = before;
          setObjects(before);
        }
        setMessage(response?.error || "Unable to save change");
      }
    });
  };

  useEffect(() => {
    const sync = ({ objects: next, members }) => {
      objectsRef.current = next || [];
      setObjects(next || []);
      setUsers(members || []);
      setStatus("Connected");
    };
    const operation = ({ operation: incoming }) => {
      objectsRef.current = apply(objectsRef.current, incoming);
      setObjects(objectsRef.current);
      if (incoming.type === "clear") setSelectedId(null);
    };
    const connect = () => {
      setStatus("Connected");
      socket.emit("room:join", { roomId }, (response) => {
        if (!response?.ok) {
          setMessage(response?.error || "Unable to join room");
          navigate("/");
        }
      });
    };
    const reconnect = () => setStatus("Reconnecting");

    socket.on("whiteboard:sync", sync);
    socket.on("whiteboard:operation", operation);
    socket.on("presence:update", setUsers);
    socket.on("activity", (item) =>
      setActivities((current) => [item, ...current].slice(0, 8)),
    );
    socket.on("connect", connect);
    socket.on("disconnect", reconnect);
    if (socket.connected) connect();
    return () => {
      socket.off("whiteboard:sync", sync);
      socket.off("whiteboard:operation", operation);
      socket.off("presence:update", setUsers);
      socket.off("activity");
      socket.off("connect", connect);
      socket.off("disconnect", reconnect);
    };
  }, [roomId, socket, navigate]);

  useEffect(() => {
    const keyboard = (event) => {
      if (event.key === "Escape") setSelectedId(null);
      if ((event.key === "Delete" || event.key === "Backspace") && selectedId) {
        event.preventDefault();
        commit({ type: "delete", id: selectedId });
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  });

  const exportBoard = () => {
    const link = Object.assign(document.createElement("a"), {
      href: canvas.current.exportPng(),
      download: `${roomId}.png`,
    });
    link.click();
  };

  const clearBoard = () => {
    if (!window.confirm("Clear this whiteboard for everyone?")) return;
    commit({ type: "clear" });
    setSelectedId(null);
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setMessage("Invite link copied");
    } catch {
      setMessage("Copy the link from your browser");
    }
  };

  return (
    <main className="workspace">
      <header className="topbar">
        <div className="room-title">
          <span className="brand-mark">WB</span>
          <div>
            <strong>Whiteboard</strong>
            <small>{roomId}</small>
          </div>
        </div>
        <div className={`connection ${status.toLowerCase()}`}>{status}</div>
        <div className="avatars">
          {users.slice(0, 4).map((user) => (
            <span key={user.id} title={`${user.name} (${user.role})`}>
              {user.name.slice(0, 1).toUpperCase()}
            </span>
          ))}
        </div>
        <button onClick={share}>Share</button>
        <button className="secondary small" onClick={() => navigate("/")}>
          Leave
        </button>
      </header>
      <Toolbar
        tool={tool}
        setTool={setTool}
        color={style.color}
        setColor={(color) => setStyle({ ...style, color })}
        strokeWidth={style.strokeWidth}
        setStrokeWidth={(strokeWidth) => setStyle({ ...style, strokeWidth })}
        onDelete={() => {
          if (selectedId) {
            commit({ type: "delete", id: selectedId });
            setSelectedId(null);
          }
        }}
        selectedId={selectedId}
        onClear={clearBoard}
        onExport={exportBoard}
      />
      <section className="board-area">
        <DrawingCanvas
          ref={canvas}
          objects={objects}
          tool={tool}
          style={style}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          onCreate={(object) => commit({ type: "create", object })}
          onUpdate={commit}
        />
        {message && (
          <div className="toast" onAnimationEnd={() => setMessage("")}>
            {message}
          </div>
        )}
      </section>
      <aside className="activity">
        <h2>In this room</h2>
        {users.map((user) => (
          <p key={user.id}>
            <span className="presence" />
            {user.name}
            <small>{user.role}</small>
          </p>
        ))}
        <h2>Activity</h2>
        {activities.map((item, index) => (
          <p className="event" key={`${item.at}-${index}`}>
            {item.message}
          </p>
        ))}
      </aside>
    </main>
  );
}
