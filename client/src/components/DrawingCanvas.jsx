// Fixed-coordinate canvas for pencil and rectangle drawing.
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { getObjectBounds, getResizeHandle, hitTestObject, moveObject, resizeCursor, resizeObject } from "./selectionUtils";

const GRID_SIZE = 25;
const handles = { nw: [0, 0], n: [0.5, 0], ne: [1, 0], e: [1, 0.5], se: [1, 1], s: [0.5, 1], sw: [0, 1], w: [0, 0.5] };

const DrawingCanvas = forwardRef(function DrawingCanvas(
  { objects, tool, style, selectedId, setSelectedId, onCreate, onUpdate }, ref,
) {
  const canvasRef = useRef();
  const draft = useRef();
  const dragRef = useRef(null);
  const [cursor, setCursor] = useState("crosshair");

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const bounds = canvas.parentElement.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(bounds.width * ratio);
    canvas.height = Math.round(bounds.height * ratio);
    canvas.style.width = `${bounds.width}px`;
    canvas.style.height = `${bounds.height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, bounds.width, bounds.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, bounds.width, bounds.height);
    ctx.fillStyle = "rgba(148, 163, 184, 0.32)";
    for (let x = 0; x <= bounds.width; x += GRID_SIZE)
      for (let y = 0; y <= bounds.height; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.arc(x, y, 0.7, 0, Math.PI * 2);
        ctx.fill();
      }

    const display = draft.current?.id
      ? objects.map((object) => object.id === draft.current.id ? draft.current : object)
      : [...objects, ...(draft.current ? [draft.current] : [])];
    display.forEach((object) => {
      ctx.save();
      ctx.strokeStyle = object.strokeColor;
      ctx.lineWidth = object.strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (object.type === "pencil") {
        ctx.beginPath();
        object.points?.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
        ctx.stroke();
      }
      if (object.type === "rectangle") {
        ctx.beginPath();
        ctx.rect(object.x, object.y, object.width, object.height);
        ctx.stroke();
      }
      if (selectedId === object.id) {
        const box = getObjectBounds(object);
        ctx.strokeStyle = "#2563eb";
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 1;
        ctx.strokeRect(box.x - 5, box.y - 5, Math.max(box.width + 10, 10), Math.max(box.height + 10, 10));
        ctx.setLineDash([]);
        Object.values(handles).forEach(([offsetX, offsetY]) => {
          const x = box.x + box.width * offsetX - 4;
          const y = box.y + box.height * offsetY - 4;
          ctx.fillStyle = "#fff";
          ctx.strokeStyle = "#2563eb";
          ctx.fillRect(x, y, 8, 8);
          ctx.strokeRect(x, y, 8, 8);
        });
      }
      ctx.restore();
    });
  }, [objects, selectedId]);

  useEffect(() => {
    render();
    const observer = new ResizeObserver(render);
    observer.observe(canvasRef.current.parentElement);
    return () => observer.disconnect();
  }, [render]);

  useImperativeHandle(ref, () => ({ exportPng: () => canvasRef.current.toDataURL("image/png") }));

  const point = (event) => {
    const bounds = canvasRef.current.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };

  const down = (event) => {
    if (event.button !== 0) return;
    const { x, y } = point(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    if (tool === "select") {
      const selected = objects.find((object) => object.id === selectedId);
      const handle = selected && getResizeHandle(getObjectBounds(selected), x, y);
      if (handle) {
        dragRef.current = { mode: "resize", handle, startX: x, startY: y, object: structuredClone(selected), moved: false };
        return;
      }
      const found = [...objects].reverse().find((object) => hitTestObject(object, x, y));
      setSelectedId(found?.id || null);
      if (found) dragRef.current = { mode: "move", startX: x, startY: y, object: structuredClone(found), moved: false };
      return;
    }
    if (tool === "eraser") {
      const found = [...objects].reverse().find((object) => hitTestObject(object, x, y));
      if (found) onUpdate({ type: "delete", id: found.id });
      return;
    }
    draft.current = {
      id: crypto.randomUUID(), type: tool, x, y, width: 0, height: 0,
      points: tool === "pencil" ? [{ x, y }] : undefined,
      strokeColor: style.color, strokeWidth: style.strokeWidth,
    };
    render();
  };

  const move = (event) => {
    const { x, y } = point(event);
    const drag = dragRef.current;
    if (drag) {
      draft.current = drag.mode === "resize"
        ? resizeObject(drag.object, drag.handle, x, y)
        : moveObject(drag.object, x - drag.startX, y - drag.startY);
      drag.moved ||= x !== drag.startX || y !== drag.startY;
      render();
      return;
    }
    if (tool === "select") {
      const selected = objects.find((object) => object.id === selectedId);
      const handle = selected && getResizeHandle(getObjectBounds(selected), x, y);
      setCursor(handle ? resizeCursor(handle) : [...objects].reverse().some((object) => hitTestObject(object, x, y)) ? "move" : "default");
    }
    if (!draft.current) return;
    if (draft.current.type === "pencil") draft.current.points.push({ x, y });
    else {
      draft.current.width = x - draft.current.x;
      draft.current.height = y - draft.current.y;
    }
    render();
  };

  const up = () => {
    const drag = dragRef.current;
    if (drag) {
      if (drag.moved && draft.current?.id === drag.object.id) onUpdate({ type: "update", object: draft.current });
      dragRef.current = null;
      draft.current = null;
      return;
    }
    if (draft.current) {
      const object = draft.current;
      const drawable = object.type === "pencil" ? object.points.length > 1 : Math.abs(object.width) >= 8 && Math.abs(object.height) >= 8;
      if (drawable) onCreate(object);
      draft.current = null;
    }
  };

  const cancel = () => { dragRef.current = null; draft.current = null; render(); };

  return <canvas ref={canvasRef} className="board-canvas" style={{ cursor: tool === "select" ? cursor : "crosshair" }} onContextMenu={(event) => event.preventDefault()} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel} />;
});

export default DrawingCanvas;
