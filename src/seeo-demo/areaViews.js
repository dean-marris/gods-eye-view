import { areas } from "./data.js";
export const areaViews = {
  receiving: {
    file: "receiving-camera-synthetic.png",
    description:
      "Inbound unloading and goods checking: a forklift transfers pallets from a trailer while receiving staff inspect and scan incoming orders.",
  },
  storage: {
    file: "storage-camera-synthetic.png",
    description:
      "A view down the storage aisle: loaded racks, a replenishment forklift and workers approaching the dispatch end of the aisle.",
  },
  unknown: {
    file: "unknown-camera-synthetic.png",
    description:
      "A fictional rear service area with utility plant, a maintenance cart and a personnel exit. Monitoring remains unavailable; this concept image provides no evidence of actual conditions.",
  },
  packing: {
    file: "packing-camera-synthetic.png",
    description:
      "Packing workers scan, pack and label cartons beside a roller conveyor, with materials and completed orders staged nearby.",
  },
  crossing: {
    file: "crossing-camera-synthetic.png",
    description:
      "Dispatch crossing: a loaded forklift approaches the marked crossing while two workers wait on the pedestrian walkway.",
  },
  dispatch: {
    file: "dispatch-camera-synthetic.png",
    description:
      "Outbound orders staged at the dispatch bays, with a forklift loading a backed-in trailer and a checker working behind the walkway barrier.",
  },
  yard: {
    file: "ten-trailer-camera-synthetic.png",
    description:
      "A blue truck and a TEN Leasing-branded trailer reversing toward Bay 1. This fictional generated illustration uses illustrative branding. The button below opens the authored 3D docking replay.",
  },
};
export function cameraArea(id, selectedArea) {
  const current = areas.find(
    (area) => area.id === selectedArea && area.camera === id,
  );
  return current?.id ?? areas.find((area) => area.camera === id)?.id;
}
