// Focused unit tests for request and drawing-object validation.
import test from "node:test";
import assert from "node:assert/strict";
import { validDrawingObject, validRoomId } from "../utils/validation.js";

test("accepts secure room identifiers", () => {
  assert.equal(validRoomId("team-plan_2026"), true);
  assert.equal(validRoomId("bad room"), false);
  assert.equal(validRoomId("short"), false);
});

test("rejects malformed drawing objects", () => {
  assert.equal(
    validDrawingObject({
      id: "shape-1",
      type: "rectangle",
      x: 0,
      y: 0,
      width: 100,
      height: 40,
    }),
    true,
  );
  assert.equal(
    validDrawingObject({ id: "shape-1", type: "unknown", x: 0, y: 0 }),
    false,
  );
  assert.equal(
    validDrawingObject({
      id: "text-1",
      type: "text",
      x: 0,
      y: 0,
      text: "x".repeat(2001),
    }),
    false,
  );
});
