// Validation helpers for untrusted room and whiteboard-operation payloads.

const OBJECT_TYPES = new Set([
  "pencil",
  "line",
  "rectangle",
  "circle",
  "arrow",
  "text",
]);

const MAX_COORDINATE = 100_000;
const MAX_POINTS = 5_000;
const MAX_TEXT_LENGTH = 2_000;

/** Returns true only for safe, URL-friendly room identifiers. */
export const validRoomId = (roomId) =>
  /^[A-Za-z0-9_-]{6,32}$/.test(roomId || "");

/** Allows six-digit hex values and the transparent fill sentinel. */
const validColor = (color) =>
  typeof color === "string" &&
  (/^#[0-9a-fA-F]{6}$/.test(color) || color === "transparent");

/** Guards coordinates against non-numeric, infinite, and unreasonably large values. */
const validCoordinate = (value) =>
  value === undefined ||
  (Number.isFinite(value) && Math.abs(value) <= MAX_COORDINATE);

/** Validates a freehand point before it can be persisted. */
const validPoint = (point) =>
  Number.isFinite(point?.x) && Number.isFinite(point?.y);

/**
 * Validates the persisted shape format used by Socket.IO create and update operations.
 * Clients never control which unvalidated values are stored in MongoDB.
 */
export const validDrawingObject = (item) => {
  if (!item || typeof item.id !== "string") return false;

  const hasValidIdentity = /^[A-Za-z0-9_-]{1,80}$/.test(item.id);
  const hasValidType = OBJECT_TYPES.has(item.type);
  const hasValidCoordinates = [
    item.x,
    item.y,
    item.width,
    item.height,
  ].every(validCoordinate);
  const hasValidText =
    item.type !== "text" ||
    (typeof item.text === "string" && item.text.length <= MAX_TEXT_LENGTH);
  const hasValidPoints =
    !item.points ||
    (Array.isArray(item.points) &&
      item.points.length <= MAX_POINTS &&
      item.points.every(validPoint));
  const hasValidStyle =
    (item.strokeColor === undefined || validColor(item.strokeColor)) &&
    (item.fillColor === undefined || validColor(item.fillColor)) &&
    (item.strokeWidth === undefined ||
      (Number.isFinite(item.strokeWidth) &&
        item.strokeWidth >= 1 &&
        item.strokeWidth <= 40)) &&
    (item.fontSize === undefined ||
      (Number.isFinite(item.fontSize) &&
        item.fontSize >= 8 &&
        item.fontSize <= 120));

  return (
    hasValidIdentity &&
    hasValidType &&
    hasValidCoordinates &&
    hasValidText &&
    hasValidPoints &&
    hasValidStyle
  );
};
