import * as C from "cesium";
import { createDispatchPose } from "./dispatchPose.js";
// Dedicated local dispatch scene: exactly the engine's metres and crossing geometry.
export function createDispatchScene(container, initialRun) {
  const viewer = new C.Viewer(container, {
    baseLayer: false,
    globe: false,
    skyBox: false,
    skyAtmosphere: false,
    animation: false,
    timeline: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
    requestRenderMode: true,
    maximumRenderTimeChange: Infinity,
  });
  viewer.scene.backgroundColor = C.Color.fromCssColorString("#e8efeb");
  viewer.scene.fog.enabled = false;
  viewer.scene.screenSpaceCameraController.minimumZoomDistance = 8;
  viewer.scene.screenSpaceCameraController.maximumZoomDistance = 180;
  const origin = C.Cartesian3.fromDegrees(0, 0, 0),
    transform = C.Transforms.eastNorthUpToFixedFrame(origin);
  const point = (x, y, z = 0) =>
    C.Matrix4.multiplyByPoint(
      transform,
      new C.Cartesian3(x, -y, z),
      new C.Cartesian3(),
    );
  const color = (hex, alpha = 1) =>
    C.Color.fromCssColorString(hex).withAlpha(alpha);
  let run,
    currentAngle = "overview";
  const parts = new Map(),
    gates = [];
  function box(x, y, width, depth, height, fill, z = 0) {
    const position = point(x, y, z + height / 2);
    return viewer.entities.add({
      position,
      orientation: C.Transforms.headingPitchRollQuaternion(
        position,
        new C.HeadingPitchRoll(),
      ),
      box: {
        dimensions: new C.Cartesian3(width, depth, height),
        material: color(fill),
        outline: true,
        outlineColor: color("#647b74", 0.3),
      },
    });
  }
  // Nonconstant pose properties keep moving boxes/ellipsoids on Cesium's
  // dynamic updater instead of rebuilding asynchronous constant primitives.
  function dynamic(entity) {
    const pose = { position: entity.position.getValue(C.JulianDate.now()), orientation: entity.orientation?.getValue(C.JulianDate.now()) };
    entity.position = new C.CallbackPositionProperty(() => pose.position, false);
    entity.orientation = new C.CallbackProperty(() => pose.orientation, false);
    entity.dispatchPose = pose;
    return entity;
  }
  function place(entity, actor, dx, dy, z) {
    const local = (entity.dispatchLocalPose ??= createDispatchPose()).update(actor, dx, dy, z);
    entity.dispatchPose.position = point(local.x, local.y, local.z);
    entity.dispatchPose.orientation = C.Transforms.headingPitchRollQuaternion(entity.dispatchPose.position, new C.HeadingPitchRoll(local.heading, 0, 0));
  }
  function line(points, fill, width = 2) {
    return viewer.entities.add({
      polyline: {
        positions: points.map(([x, y, z = 0.04]) => point(x, y, z)),
        width,
        material: color(fill),
      },
    });
  }
  function camera(angle = currentAngle) {
    currentAngle = angle;
    viewer.camera.lookAt(
      point(angle === "crossing" ? (run.crossing ?? 27) : 3, 0, 0),
      new C.HeadingPitchRange(
        C.Math.toRadians(angle === "crossing" ? 28 : -20),
        C.Math.toRadians(angle === "crossing" ? -25 : -58),
        angle === "crossing" ? 35 : 68,
      ),
    );
    viewer.scene.requestRender();
  }
  function configure(next) {
    run = next;
    viewer.entities.removeAll();
    parts.clear();
    gates.length = 0;
    const bounds = run.geometry.bounds;
    box(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, bounds.width, bounds.height, 0.05, "#dce6df", -0.1);
    box(0, 0, 52, 6.8, 0.04, "#aebfb7");
    if (run.crossing !== null) box(run.crossing, 0, 3, 7, 0.03, "#d9bc82", 0.05);
    for (let x = -24; x < 25; x += 3)
      line(
        [
          [x, 0],
          [x + 1.4, 0],
        ],
        "#edf1e9",
      );
    for (const y of [-8, 8]) {
      box(-13, y, 8, 2, 1.6, "#c3cec4");
      box(18, run.config.routeMode === "bypass" ? Math.sign(y) * 10.5 : y, 6, 2, 1.6, "#c3cec4");
    }
    for (const points of run.geometry.barriers) {
      for (let i = 1; i < points.length; i++) {
        const [x, y] = points[i - 1], [xx, yy] = points[i];
        box((x + xx) / 2, (y + yy) / 2, Math.abs(xx - x) || .15, Math.abs(yy - y) || .15, .15, "#748c54", .75);
        const length = Math.hypot(xx - x, yy - y), steps = Math.ceil(length / 2);
        for (let j = 0; j <= steps; j++) box(x + (xx-x)*j/steps, y+(yy-y)*j/steps, .13, .13, 1, "#748c54");
      }
    }
    if (run.config.gate)
      for (const y of [-3.8, 3.8]) {
        box(run.crossing - 1, y, 0.16, 0.16, 1.2, "#d69b40");
        gates.push({
          y,
          arm: box(run.crossing, y, 2, 0.12, 0.12, "#d69b40", 0.9),
        });
      }
    line(run.geometry.personPath, "#809b50", 3);
    for (const job of run.jobs) {
      const person = job.kind === "person",
        radius = person ? 0.35 : 1.5;
      const body = person
        ? viewer.entities.add({
            position: point(0, 0, 0.8),
            ellipsoid: {
              radii: new C.Cartesian3(0.25, 0.25, 0.8),
              material: color("#b5cf49"),
            },
          })
        : box(0, 0, 2.2, 1.4, 1.2, "#dba24d");
      const head = person
        ? viewer.entities.add({
            position: point(0, 0, 1.75),
            ellipsoid: {
              radii: new C.Cartesian3(0.22, 0.22, 0.18),
              material: color("#f6be48"),
            },
          })
        : box(0, 0, 1, 1.1, 0.65, "#3d5b62", 1.2);
      const extras = [];
      const detail = (dx, dy, z, w, d, h, fill) =>
        extras.push({ entity: box(0, 0, w, d, h, fill), dx, dy, z });
      if (!person) {
        detail(0.75, 0, 1.1, 0.12, 1.1, 2.1, "#344d50"); // mast
        for (const y of [-0.4, 0.4])
          detail(1.1, y, 0.18, 0.65, 0.12, 0.1, "#667a7b");
        detail(1, 0, 0.7, 0.5, 0.9, 0.75, "#ae9770"); // illustrative load
        for (const x of [-0.7, 0.65])
          for (const y of [-0.7, 0.7])
            detail(x, y, 0.25, 0.45, 0.16, 0.45, "#2a3e42");
      }
      const ring = viewer.entities.add({
        polyline: {
          positions: [],
          width: 1.5,
          material: color("#46675a", 0.7),
        },
      });
      const label = viewer.entities.add({
        position: point(0, 0, 2.2),
        label: {
          text: job.id,
          font: "11px sans-serif",
          fillColor: color("#173e43"),
          showBackground: true,
          backgroundColor: color("#ffffff", 0.8),
          pixelOffset: new C.Cartesian2(0, -8),
          disableDepthTestDistance: Infinity,
        },
      });
      for (const entity of [body, head, label, ...extras.map(e => e.entity)]) dynamic(entity);
      parts.set(job.id, { body, head, ring, label, radius, extras });
    }
    camera();
  }
  function update(frame, highlights) {
    for (const { y, arm } of gates) {
      const open = frame.gatePhase === "person";
      arm.position = point(run.crossing - (open ? 1 : 0), y, open ? 1.9 : 0.96);
      arm.box.dimensions = new C.Cartesian3(
        open ? 0.12 : 2,
        0.12,
        open ? 2 : 0.12,
      );
      arm.box.material = color(open ? "#8fa44a" : "#d69b40");
    }
    for (const actor of frame.actors) {
      const p = parts.get(actor.id),
        show = ["active", "queued"].includes(actor.status),
        selected = highlights.includes(actor.id);
      for (const entity of [
        p.body,
        p.head,
        p.ring,
        p.label,
        ...p.extras.map((e) => e.entity),
      ])
        entity.show = show;
      if (!show) continue;
      const person = actor.kind === "person";
      place(p.body, actor, 0, 0, person ? .8 : .6);
      place(p.head, actor, 0, 0, person ? 1.75 : 1.525);
      for (const {entity, dx, dy, z} of p.extras) place(entity, actor, dx, dy, z);
      place(p.label, actor, 0, 0, 2.5);
      p.ring.polyline.positions = Array.from({ length: 33 }, (_, i) =>
        point(
          actor.x + Math.cos((i * Math.PI) / 16) * p.radius,
          actor.y + Math.sin((i * Math.PI) / 16) * p.radius,
          0.12,
        ),
      );
      if (p.selected !== selected) {
      p.ring.polyline.material = color(selected ? "#df4e45" : "#4d7565");
      p.ring.polyline.width = selected ? 4 : 1.5;
      const shape = person ? p.body.ellipsoid : p.body.box;
      shape.material = color(
        selected ? "#df4e45" : person ? "#b5cf49" : "#dba24d",
      );
      p.selected = selected;
      }
    }
    viewer.scene.requestRender();
  }
  configure(initialRun);
  return {
    configure,
    update,
    camera,
    resize() {
      viewer.resize();
      camera();
    },
    destroy() {
      if (!viewer.isDestroyed()) viewer.destroy();
    },
  };
}
