import * as C from "cesium";
import { facilityFitBounds } from "./sceneInteraction.js";
// A local metre-based cutout. No map imagery, API key or external site data.
export function createLoadingScene(
  container,
  run,
  sharedLayout = run.config.layout,
) {
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
    // Continuous rendering while mounted also paints asynchronously prepared primitives
    // when playback is paused. Destroying the scene stops its render loop.
    requestRenderMode: false,
    maximumRenderTimeChange: Infinity,
  });
  viewer.scene.backgroundColor = C.Color.fromCssColorString("#e8efeb");
  viewer.scene.fog.enabled = false;
  const transform = C.Transforms.eastNorthUpToFixedFrame(
    C.Cartesian3.fromDegrees(0, 0),
  );
  const point = (x, y, z = 0) =>
    C.Matrix4.multiplyByPoint(
      transform,
      new C.Cartesian3(x, -y, z),
      new C.Cartesian3(),
    );
  const color = (hex) => C.Color.fromCssColorString(hex);
  function box(x, y, w, d, h, fill, z = 0) {
    const position = point(x, y, z + h / 2);
    return viewer.entities.add({
      position,
      orientation: C.Transforms.headingPitchRollQuaternion(
        position,
        new C.HeadingPitchRoll(),
      ),
      box: { dimensions: new C.Cartesian3(w, d, h), material: color(fill) },
    });
  }
  function label(x, y, text, z = 1) {
    return viewer.entities.add({
      position: point(x, y, z),
      label: {
        text,
        font: "12px sans-serif",
        fillColor: color("#173e43"),
        showBackground: true,
        backgroundColor: color("#ffffff").withAlpha(0.85),
        disableDepthTestDistance: Infinity,
        pixelOffset: new C.Cartesian2(0, -12),
      },
    });
  }
  function route(a, b, fill) {
    viewer.entities.add({
      polyline: {
        positions: [point(...a, 0.08), point(...b, 0.08)],
        width: 3,
        material: color(fill),
      },
    });
  }
  box(-16, -7, 76, 40, 0.1, "#dde7df", -0.2);
  route(run.points.staging, run.points.dock, "#d6a95b");
  route(run.points.station, run.points.check, "#8fa44a");
  box(12, 0, 10, 3.4, 0.3, "#ffcc00", 1);
  box(12, -1.72, 10, .08, .2, "#d40511", 1.05);
  box(18.5, 0, 3.4, 3.2, 2.5, "#ffcc00");
  for (const x of [8, 15, 19])
    for (const y of [-1.8, 1.8]) box(x, y, 0.8, 0.45, 0.8, "#2b4143");
  label(13, 2.8, "PARKED TRAILER");
  label(6, -2, "DOCK");
  label(0, 2, "INSPECTION");
  label(
    -run.config.layout.staging,
    -4,
    `STAGING · ${run.config.layout.staging} m`,
  );
  label(
    0,
    -run.config.layout.checker - 2,
    `CHECKER · ${run.config.layout.checker} m`,
  );
  const stock = run.jobs.map((j, i) =>
    box(
      -run.config.layout.staging - 2 - (i % 6) * 0.7,
      3 + Math.floor(i / 6) * 0.8,
      0.6,
      0.65,
      0.8,
      "#ae9770",
    ),
  );
  const loaded = run.jobs.map((j, i) =>
    box(
      8 + (i % 6) * 1.2,
      -1 + Math.floor((i % 24) / 6) * 0.55,
      0.9,
      0.45,
      0.8,
      "#ae9770",
      1.3 + Math.floor(i / 24) * 0.8,
    ),
  );
  const forks = ["F1", "F2"].map((id) => {
    const parts = [];
    const part = (dx, dy, z, w, d, h, fill, load = false) =>
      parts.push({ entity: box(0, 0, w, d, h, fill), dx, dy, z, load });
    part(0, 0, 0.6, 2.2, 1.3, 1.1, "#dfa147");
    part(-0.45, 0, 1.5, 0.9, 1.2, 0.7, "#345c65");
    part(0.8, 0, 1.15, 0.15, 1.3, 2.1, "#3d5556");
    for (const y of [-0.45, 0.45]) part(1.3, y, 0.18, 1, 0.1, 0.12, "#526c6e");
    for (const x of [-0.7, 0.6])
      for (const y of [-0.7, 0.7]) part(x, y, 0.35, 0.5, 0.2, 0.5, "#2b4143");
    part(1.35, 0, 0.8, 1, 1.1, 0.9, "#ae9770", true);
    return { parts, label: label(0, 0, id, 3) };
  });
  const checker = viewer.entities.add({
    position: point(0, 0, 0.8),
    ellipsoid: {
      radii: new C.Cartesian3(0.3, 0.3, 0.8),
      material: color("#a8c34e"),
    },
  });
  const head = viewer.entities.add({
    position: point(0, 0, 1.7),
    ellipsoid: {
      radii: new C.Cartesian3(0.24, 0.24, 0.2),
      material: color("#efbf58"),
    },
  });
  const checkerLabel = label(0, 0, "CHECKER", 2);
  function camera() {
    const width = container.clientWidth,
      height = container.clientHeight;
    if (width < 1 || height < 1) return;
    viewer.resize();
    // Identical extents on both sides keep the comparison at the same scale.
    // Include all bounded routes, stock, cab and labels, rather than assuming
    // a fixed range fits every canvas aspect ratio.
    const minX = -sharedLayout.staging - 8,
      maxX = 25;
    const minY = -sharedLayout.checker - 6,
      maxY = 13;
    const centerX = (minX + maxX) / 2,
      centerY = (minY + maxY) / 2;
    const heading = C.Math.toRadians(-18),
      pitch = C.Math.toRadians(-48);
    const corners = [minX, maxX].flatMap((x) =>
      [minY, maxY].flatMap((y) =>
        [-1, 6].map((z) => [x - centerX, -(y - centerY), z]),
      ),
    );
    const range = facilityFitBounds(
      corners,
      viewer.camera.frustum.fovy,
      width / height,
      heading,
      pitch,
    );
    viewer.camera.lookAt(
      point(centerX, centerY),
      new C.HeadingPitchRange(heading, pitch, range),
    );
    viewer.scene.requestRender();
  }
  function update(frame) {
    stock.forEach((e, i) => (e.show = i >= frame.counts.picked));
    loaded.forEach((e, i) => (e.show = i < frame.counts.delivered));
    frame.forklifts.forEach((a, i) => {
      const offset = i === 0 ? -0.9 : 0.9;
      for (const p of forks[i].parts) {
        p.entity.show = !p.load || a.carrying;
        p.entity.position = point(
          a.x + Math.cos(a.heading) * p.dx - Math.sin(a.heading) * p.dy,
          a.y +
            offset +
            Math.sin(a.heading) * p.dx +
            Math.cos(a.heading) * p.dy,
          p.z,
        );
        p.entity.orientation = C.Transforms.headingPitchRollQuaternion(
          point(a.x, a.y),
          new C.HeadingPitchRoll(-a.heading),
        );
      }
      forks[i].label.position = point(a.x, a.y + offset, 3);
      forks[i].label.label.text =
        `${a.id} · ${a.stage}${a.carrying ? " · " + a.pallet : ""}`;
    });
    checker.position = point(frame.checker.x, frame.checker.y, 0.8);
    head.position = point(frame.checker.x, frame.checker.y, 1.7);
    checkerLabel.position = point(frame.checker.x, frame.checker.y, 2.2);
    viewer.scene.requestRender();
  }
  const resizeObserver = new ResizeObserver(camera);
  resizeObserver.observe(container);
  camera();
  return {
    update,
    camera,
    resize() {
      viewer.resize();
      camera();
    },
    destroy() {
      resizeObserver.disconnect();
      if (!viewer.isDestroyed()) viewer.destroy();
    },
  };
}
