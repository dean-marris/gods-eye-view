import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveFacilityPick,
  resolveFacilityHits,
  facilityFitBounds,
} from "./sceneInteraction.js";

test("coverage overlays do not swallow the area clicked behind them", () => {
  assert.deepEqual(resolveFacilityHits(["coverage:C01", "label:dispatch"]), {
    type: "area",
    id: "dispatch",
  });
  assert.deepEqual(resolveFacilityHits(["ray:C03:0", "rack:7:28"]), {
    type: "area",
    id: "storage",
  });
  assert.deepEqual(resolveFacilityHits(["coverage:C05"]), {
    type: "area",
    id: "yard",
  });
});

test("camera marker, label, pole and coverage all select the camera area", () => {
  for (const id of ["camera:C05", "camera-label:C05", "camera-pole:C05"])
    assert.deepEqual(resolveFacilityPick(id), {
      type: "camera",
      id: "C05",
      area: "yard",
    });
  assert.deepEqual(resolveFacilityPick("camera-label:C01"), {
    type: "camera",
    id: "C01",
    area: "crossing",
  });
});

test("area labels and foreground rack or dock geometry remain selectable", () => {
  for (const id of [
    "label:storage",
    "area:storage",
    "rack:7:28",
    "shelf:7:28:1.5",
    "pallet:7:28:.3:.5",
  ])
    assert.deepEqual(resolveFacilityPick(id), { type: "area", id: "storage" });
  assert.deepEqual(resolveFacilityPick("dock-label:0"), {
    type: "area",
    id: "dispatch",
  });
  assert.deepEqual(resolveFacilityPick("actor-label:TR-01"), {
    type: "area",
    id: "yard",
  });
  assert.deepEqual(resolveFacilityPick("event:EX-003"), {
    type: "event",
    id: "EX-003",
  });
  assert.equal(resolveFacilityPick("camera:missing"), null);
});

test("rectangular scene framing fits the corners without a loose sphere", () => {
  const corners = [
    [-10, -5, 0],
    [10, -5, 0],
    [-10, 5, 0],
    [10, 5, 0],
  ];
  assert.ok(
    Math.abs(
      facilityFitBounds(corners, Math.PI / 2, 2, 0, -Math.PI / 2) - 5.6,
    ) < 0.001,
  );
  assert.ok(
    Math.abs(
      facilityFitBounds(corners, Math.PI / 2, 0.5, 0, -Math.PI / 2) - 22.4,
    ) < 0.001,
  );
});

test("camera markers open a camera view while coverage still selects its area", () => {
  assert.deepEqual(resolveFacilityPick("camera:C01"), {
    type: "camera",
    id: "C01",
    area: "crossing",
  });
});
