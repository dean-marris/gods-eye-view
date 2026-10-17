import test from "node:test";
import assert from "node:assert/strict";
import { areas } from "./data.js";
import { areaViews, cameraArea } from "./areaViews.js";

test("all seven areas have a distinct generated image including unavailable rear monitoring", () => {
  assert.equal(areas.length, 7);
  assert.equal(new Set(areas.map((area) => areaViews[area.id].file)).size, 7);
  for (const area of areas)
    assert.ok(areaViews[area.id].description.length > 20);
  assert.equal(areaViews.yard.file, "ten-trailer-camera-synthetic.png");
  assert.equal(cameraArea("C04"), "unknown");
});
test("shared cameras preserve the selected area while other cameras use their own default", () => {
  assert.equal(cameraArea("C02", "packing"), "packing");
  assert.equal(cameraArea("C01", "dispatch"), "dispatch");
  assert.equal(cameraArea("C02", "yard"), "receiving");
  assert.equal(cameraArea("C05", "storage"), "yard");
  assert.equal(cameraArea("missing"), undefined);
});
