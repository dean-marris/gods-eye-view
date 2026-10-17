import { resolveFusionPick } from "./fusion.js";
import { areas, cameras, events } from "./data.js";

// Every visible representation of a camera or area resolves to its owner.
export function resolveFacilityPick(value) {
  const fusion = resolveFusionPick(value);
  if (fusion) return fusion;
  if (typeof value !== "string") return null;
  const [kind, id] = value.split(":");
  if (["area", "label"].includes(kind) && areas.some((area) => area.id === id))
    return { type: "area", id };
  if (
    [
      "camera",
      "camera-label",
      "camera-pole",
      "coverage",
      "ray",
      "coverage-edge",
    ].includes(kind)
  ) {
    const camera = cameras.find((camera) => camera.id === id);
    const area = camera && areas.find((area) => area.camera === camera.id);
    return area
      ? ["camera", "camera-label", "camera-pole"].includes(kind)
        ? { type: "camera", id: camera.id, area: area.id }
        : { type: "area", id: area.id }
      : null;
  }
  if (kind === "event" && events.some((event) => event.id === id))
    return { type: "event", id };
  if (["actor", "actor-label"].includes(kind)) {
    const area = {
      "FL-01": "crossing",
      "P-01": "crossing",
      "FL-02": "receiving",
      "P-02": "packing",
      "TR-01": "yard",
      "FL-03": "storage",
      "FL-04": "dispatch",
      "P-03": "storage",
      "P-04": "dispatch",
      "P-05": "packing",
      "P-06": "receiving",
      "P-07": "crossing",
    }[id];
    return area ? { type: "area", id: area } : null;
  }
  if (
    [
      "rack",
      "shelf",
      "pallet",
      "blind-spot",
      "blind-stripe",
      "blind-label",
    ].includes(kind)
  )
    return { type: "area", id: "storage" };
  if (["receiving-conveyor", "receiving-roller"].includes(kind))
    return { type: "area", id: "receiving" };
  if (["packing", "conveyor", "roller", "conveyor-carton"].includes(kind))
    return { type: "area", id: "packing" };
  if (["dock", "dock-label", "dock-frame", "dock-frame-end"].includes(kind))
    return { type: "area", id: "dispatch" };
  if (
    [
      "parked-trailer",
      "parked-cab",
      "yard-lane",
      "yard-direction",
      "yard-slab",
    ].includes(kind)
  )
    return { type: "area", id: "yard" };
  return null;
}

export function facilityFitBounds(
  corners,
  verticalFov,
  aspectRatio,
  heading,
  pitch,
) {
  const right = [Math.cos(heading), -Math.sin(heading), 0];
  const forward = [
    Math.sin(heading) * Math.cos(pitch),
    Math.cos(heading) * Math.cos(pitch),
    Math.sin(pitch),
  ];
  const up = [
    -Math.sin(heading) * Math.sin(pitch),
    -Math.cos(heading) * Math.sin(pitch),
    Math.cos(pitch),
  ];
  const dot = (a, b) => a.reduce((sum, n, i) => sum + n * b[i], 0);
  const verticalTan = Math.tan(verticalFov / 2),
    horizontalTan = verticalTan * aspectRatio;
  return Math.max(
    ...corners.flatMap((corner) => [
      (Math.abs(dot(corner, right)) * 1.12) / horizontalTan -
        dot(corner, forward),
      (Math.abs(dot(corner, up)) * 1.12) / verticalTan - dot(corner, forward),
    ]),
  );
}

export function resolveFacilityHits(ids) {
  let overlay = null;
  for (const id of ids) {
    const selection = resolveFacilityPick(id);
    if (!selection) continue;
    if (/^(coverage|coverage-edge|ray):/.test(id)) {
      overlay ??= selection;
      continue;
    }
    return selection;
  }
  return overlay;
}
