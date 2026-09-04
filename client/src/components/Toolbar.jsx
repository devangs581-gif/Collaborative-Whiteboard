// Minimal drawing and board-action controls.
import React from "react";

const tools = [
  ["select", "Select"],
  ["pencil", "Pencil"],
  ["rectangle", "Rectangle"],
  ["eraser", "Eraser"],
];

export default function Toolbar({
  tool,
  setTool,
  color,
  setColor,
  strokeWidth,
  setStrokeWidth,
  onDelete,
  selectedId,
  onClear,
  onExport,
}) {
  return (
    <aside className="toolbar" aria-label="Whiteboard tools">
      <div className="tool-group">
        {tools.map(([id, label]) => (
          <button
            key={id}
            title={label}
            className={tool === id ? "active" : ""}
            onClick={() => setTool(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="tool-group settings">
        <label title="Stroke color">
          Stroke
          <input
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
          />
        </label>
        <label>
          Width
          <input
            type="range"
            min="1"
            max="24"
            value={strokeWidth}
            onChange={(event) => setStrokeWidth(Number(event.target.value))}
          />
        </label>
      </div>
      <div className="tool-group actions">
        <button
          title="Delete selected object"
          className="danger"
          disabled={!selectedId}
          onClick={onDelete}
        >
          Delete
        </button>
        <button title="Clear board" className="danger" onClick={onClear}>
          Clear
        </button>
        <button title="Download PNG" onClick={() => onExport("png")}>
          PNG
        </button>
      </div>
    </aside>
  );
}
