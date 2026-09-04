// Shared geometry helpers for selection, hit testing, moving, and resizing.
const padding = 8;
const minSize = 8;

export const getObjectBounds = (object) => {
  if (object.type === "pencil" && object.points?.length) {
    const xs = object.points.map(({ x }) => x);
    const ys = object.points.map(({ y }) => y);
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    };
  }
  if (object.type === "text") {
    const width = Math.max(
      12,
      (object.text?.length || 1) * (object.fontSize || 18) * 0.58,
    );
    return {
      x: object.x,
      y: object.y - (object.fontSize || 18),
      width,
      height: object.fontSize || 18,
    };
  }
  return {
    x: Math.min(object.x, object.x + object.width),
    y: Math.min(object.y, object.y + object.height),
    width: Math.abs(object.width),
    height: Math.abs(object.height),
  };
};

const distanceToSegment = (x, y, x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = dx * dx + dy * dy;
  const t = length
    ? Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / length))
    : 0;
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
};

export const hitTestObject = (object, x, y, tolerance = padding) => {
  tolerance = Math.max(tolerance, (object.strokeWidth || 1) + 4);
  if (object.type === "pencil")
    return object.points?.some(
      (point, index, points) =>
        index &&
        distanceToSegment(
          x,
          y,
          points[index - 1].x,
          points[index - 1].y,
          point.x,
          point.y,
        ) <= tolerance,
    );
  if (object.type === "line" || object.type === "arrow")
    return (
      distanceToSegment(
        x,
        y,
        object.x,
        object.y,
        object.x + object.width,
        object.y + object.height,
      ) <= tolerance
    );
  if (object.type === "circle") {
    const bounds = getObjectBounds(object);
    const rx = Math.max(bounds.width / 2, 1);
    const ry = Math.max(bounds.height / 2, 1);
    return (
      ((x - bounds.x - rx) / rx) ** 2 + ((y - bounds.y - ry) / ry) ** 2 <= 1.15
    );
  }
  const box = getObjectBounds(object);
  return (
    x >= box.x - tolerance &&
    x <= box.x + box.width + tolerance &&
    y >= box.y - tolerance &&
    y <= box.y + box.height + tolerance
  );
};

export const getResizeHandle = (bounds, x, y, tolerance = padding) => {
  const points = {
    nw: [bounds.x, bounds.y],
    n: [bounds.x + bounds.width / 2, bounds.y],
    ne: [bounds.x + bounds.width, bounds.y],
    e: [bounds.x + bounds.width, bounds.y + bounds.height / 2],
    se: [bounds.x + bounds.width, bounds.y + bounds.height],
    s: [bounds.x + bounds.width / 2, bounds.y + bounds.height],
    sw: [bounds.x, bounds.y + bounds.height],
    w: [bounds.x, bounds.y + bounds.height / 2],
  };
  return (
    Object.entries(points).find(
      ([, point]) =>
        Math.abs(x - point[0]) <= tolerance &&
        Math.abs(y - point[1]) <= tolerance,
    )?.[0] || null
  );
};

export const moveObject = (object, dx, dy) =>
  object.type === "pencil"
    ? {
        ...object,
        points: object.points.map((point) => ({
          x: point.x + dx,
          y: point.y + dy,
        })),
      }
    : { ...object, x: object.x + dx, y: object.y + dy };

export const resizeObject = (object, handle, x, y) => {
  if (object.type === "text") return object;
  if (object.type === "line" || object.type === "arrow") {
    const start = { x: object.x, y: object.y };
    const end = { x: object.x + object.width, y: object.y + object.height };
    if (handle.includes("w") || handle.includes("n")) {
      start.x = x;
      start.y = y;
    }
    if (handle.includes("e") || handle.includes("s")) {
      end.x = x;
      end.y = y;
    }
    return {
      ...object,
      x: start.x,
      y: start.y,
      width: end.x - start.x,
      height: end.y - start.y,
    };
  }
  const old = getObjectBounds(object);
  let left = old.x;
  let top = old.y;
  let right = old.x + old.width;
  let bottom = old.y + old.height;
  if (handle.includes("w")) left = Math.min(x, right - minSize);
  if (handle.includes("e")) right = Math.max(x, left + minSize);
  if (handle.includes("n")) top = Math.min(y, bottom - minSize);
  if (handle.includes("s")) bottom = Math.max(y, top + minSize);
  if (object.type === "circle") {
    const side = Math.max(minSize, Math.max(right - left, bottom - top));
    if (handle.includes("w")) left = right - side;
    else right = left + side;
    if (handle.includes("n")) top = bottom - side;
    else bottom = top + side;
  }
  if (object.type === "pencil") {
    const scaleX = old.width ? (right - left) / old.width : 1;
    const scaleY = old.height ? (bottom - top) / old.height : 1;
    return {
      ...object,
      points: object.points.map((point) => ({
        x: left + (point.x - old.x) * scaleX,
        y: top + (point.y - old.y) * scaleY,
      })),
    };
  }
  return {
    ...object,
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
};

export const resizeCursor = (handle) =>
  ({
    nw: "nwse-resize",
    se: "nwse-resize",
    ne: "nesw-resize",
    sw: "nesw-resize",
    n: "ns-resize",
    s: "ns-resize",
    e: "ew-resize",
    w: "ew-resize",
  })[handle] || "default";
