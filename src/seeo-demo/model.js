import { forkliftLoadAssembly, actorPartVisible } from "./forkliftAssembly.js";
import { facilityRoutes, pedestrianPath, barrierPath, getFacilityFrame, workStations } from "./facilityFlow.js";
import { fusionSources, fusionNetworks, fusionHub, fusionPathPoint } from "./fusion.js";
import { fusionSymbol } from "./fusion-view.js";
import * as Cesium from "cesium";
import { areas, cameras, eventsInWindow } from "./data.js";
import { routes, getReplayFrame } from "./replay.js";
import { resolveFacilityHits, facilityFitBounds } from "./sceneInteraction.js";

// No real site anchor or external imagery. The model uses local metres only.
export function createFacilityModel(
  container,
  { selectArea, openEvidence, openCamera, selectFusion },
) {
  const viewer = new Cesium.Viewer(container, {
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
  viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#edf2f3");
  viewer.scene.fog.enabled = false;
  viewer.scene.screenSpaceCameraController.minimumZoomDistance = 12;
  viewer.scene.screenSpaceCameraController.maximumZoomDistance = 1000;
  const origin = Cesium.Cartesian3.fromDegrees(0, 0, 0);
  const actorParts = new Map();
  const frame = Cesium.Transforms.eastNorthUpToFixedFrame(origin);
  const point = (x, y, z = 0) =>
    Cesium.Matrix4.multiplyByPoint(
      frame,
      new Cesium.Cartesian3(x - 57, 32 - y, z),
      new Cesium.Cartesian3(),
    );
  const color = (value, alpha = 1) =>
    Cesium.Color.fromCssColorString(value).withAlpha(alpha);
  function box(id, x, y, w, h, z, height, fill) {
    return viewer.entities.add({
      id,
      position: point(x + w / 2, y + h / 2, z + height / 2),
      orientation: Cesium.Transforms.headingPitchRollQuaternion(
        point(x + w / 2, y + h / 2, z + height / 2),
        new Cesium.HeadingPitchRoll(),
      ),
      box: {
        dimensions: new Cesium.Cartesian3(w, h, height),
        material: color(fill),
        outline: true,
        outlineColor: color("#8ca2ae", 0.45),
      },
    });
  }
  function addActor(route) {
    const part = (
      dx,
      dy,
      z,
      w,
      h,
      height,
      fill,
      shape = "box",
      limb = false,
    ) => ({ dx, dy, z, w, h, height, fill, shape, limb });
    const components =
      route.kind === "person"
        ? [
            part(0, 0, 0.7, 0.3, 0.48, 0.65, "#d5ef2e"),
            part(0.02, 0, 0.92, 0.32, 0.5, 0.08, "#f4f8df"),
            part(0, 0, 1.38, 0.28, 0.3, 0.3, "#d4a078", "round"),
            part(0, 0, 1.61, 0.36, 0.38, 0.17, "#ffca32", "round"),
            part(0, -0.15, 0.09, 0.18, 0.19, 0.65, "#263e53", "box", true),
            part(0, 0.15, 0.09, 0.18, 0.19, 0.65, "#263e53", "box", true),
            part(0.08, -0.15, 0.02, 0.3, 0.21, 0.12, "#17272c"),
            part(0.08, 0.15, 0.02, 0.3, 0.21, 0.12, "#17272c"),
            part(0, -0.34, 0.72, 0.16, 0.16, 0.57, "#d5ef2e", "box", true),
            part(0, 0.34, 0.72, 0.16, 0.16, 0.57, "#d5ef2e", "box", true),
          ]
        : route.kind === "truck"
          ? [
              part(0, 0, 0.9, 10, 2.5, 3.3, "#dbe5eb"),
              part(0, 0, 0.7, 10, 2.5, 0.2, "#465b66"),
              part(-4.98, 0, 1.2, 0.06, 2.35, 2.8, "#afbdc6"),
              part(-4.95, 0, 1.1, 0.08, 0.08, 2.7, "#728692"),
              ...[-3.8, -2.8].flatMap((x) =>
                [-1.2, 1.2].map((y) =>
                  part(x, y, 0.12, 0.85, 0.3, 0.85, "#18272f", "round"),
                ),
              ),
              ...[
                part(0, 0, 0.55, 3, 2.4, 2.8, "#226b89"),
                part(0.7, 0, 2.1, 0.7, 2.25, 0.9, "#acd5df"),
                part(1.51, 0, 1.8, 0.04, 1.9, 0.8, "#acd5df"),
                part(1.55, -0.8, 0.8, 0.08, 0.32, 0.23, "#fff0ac"),
                part(1.55, 0.8, 0.8, 0.08, 0.32, 0.23, "#fff0ac"),
                ...[-0.8, 0.9].flatMap((x) =>
                  [-1.15, 1.15].map((y) =>
                    part(x, y, 0.1, 0.85, 0.3, 0.85, "#18272f", "round"),
                  ),
                ),
              ].map((component) => ({ ...component, cab: true })),
            ]
          : [
              part(-0.25, 0, 0.37, 2.2, 1.35, 0.63, route.color),
              part(-1.13, 0, 0.65, 0.45, 1.35, 0.7, route.color),
              part(-0.25, 0, 1.02, 0.5, 0.65, 0.15, "#273e48"),
              part(-0.5, 0, 1.12, 0.12, 0.65, 0.52, "#273e48"),
              ...[-0.7, 0.65].flatMap((x) =>
                [-0.68, 0.68].map((y) =>
                  part(x, y, 0.04, 0.65, 0.28, 0.65, "#18272f", "round"),
                ),
              ),
              ...[-0.8, 0.6].flatMap((x) =>
                [-0.58, 0.58].map((y) =>
                  part(x, y, 1.0, 0.09, 0.09, 1.25, "#314b56"),
                ),
              ),
              part(-0.1, 0, 2.22, 1.65, 1.5, 0.12, "#314b56"),
              ...[-0.48, 0.48].map((y) =>
                part(1.0, y, 0.12, 0.12, 0.12, 2.35, "#314b56"),
              ),
              part(1.03, 0, 0.42, 0.16, 1.2, 0.2, "#314b56"),
              ...forkliftLoadAssembly(),
              part(0.25, 0, 1.2, 0.3, 0.4, 0.5, "#d5ef2e"),
              part(0.25, 0, 1.7, 0.28, 0.28, 0.28, "#f5bf36", "round"),
            ];
    const parts = components.map((component, index) => ({
      ...component,
      entity: box(
        `actor:${route.id}:${index}`,
        0,
        0,
        component.w,
        component.h,
        component.z,
        component.height,
        component.fill,
      ),
    }));
    for (const component of parts) {
      component.posePosition = point(0, 0, component.z + component.height / 2);
      component.poseOrientation = Cesium.Quaternion.IDENTITY;
      component.entity.position = new Cesium.CallbackPositionProperty(
        () => component.posePosition,
        false,
      );
      component.entity.orientation = new Cesium.CallbackProperty(
        () => component.poseOrientation,
        false,
      );
      if (component.shape !== "round") continue;
      component.entity.box = undefined;
      component.entity.ellipsoid = {
        radii: new Cesium.Cartesian3(
          component.w / 2,
          component.h / 2,
          component.height / 2,
        ),
        material: color(component.fill),
      };
    }
    const name = viewer.entities.add({
      id: `actor-label:${route.id}`,
      position: point(0, 0, 4),
      label: {
        text: `${route.kind === "person" ? "Person" : route.kind === "truck" ? "Truck" : "Forklift"} · ${route.id} · SIM`,
        font: "11px sans-serif",
        fillColor: color("#203f4e"),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
    actorParts.set(route.id, { parts, name });
  }
  function updateFrame(frame) {
    for (const actor of frame.actors) {
      const group = actorParts.get(actor.id);
      if (!group) continue;
      const radians = Cesium.Math.toRadians(actor.heading),
        c = Math.cos(radians),
        s = Math.sin(radians);
      for (const part of group.parts) {
        part.entity.show = actorPartVisible(part, actor);
        const angle = part.cab
          ? Cesium.Math.toRadians(actor.cabHeading)
          : radians;
        const pc = part.cab ? Math.cos(angle) : c,
          ps = part.cab ? Math.sin(angle) : s;
        const baseX = part.cab ? actor.cabX : actor.x,
          baseY = part.cab ? actor.cabY : actor.y;
        const stride = part.limb
          ? Math.sin(frame.seconds * 5 + (part.dy > 0 ? Math.PI : 0)) * 0.12
          : 0;
        const x = baseX + (part.dx + stride) * pc - part.dy * ps,
          y = baseY + (part.dx + stride) * ps + part.dy * pc;
        const position = point(x, y, part.z + part.height / 2);
        part.posePosition = position;
        part.poseOrientation = Cesium.Transforms.headingPitchRollQuaternion(
          position,
          new Cesium.HeadingPitchRoll(angle, 0, 0),
        );
      }
      group.name.position = point(
        actor.x,
        actor.y,
        actor.kind === "truck" ? 4.1 : actor.kind === "person" ? 2.5 : 3,
      );
    }
    viewer.scene.requestRender();
  }
  function line(id, coordinates, fill, width = 3) {
    viewer.entities.add({
      id,
      polyline: {
        positions: coordinates.map((p) => point(...p)),
        width,
        material: color(fill),
        depthFailMaterial: color(fill, 0.55),
      },
    });
  }
  function label(id, text, x, y, z = 1, fill = "#3a596c") {
    viewer.entities.add({
      id,
      position: point(x, y, z),
      label: {
        text,
        font: "12px sans-serif",
        fillColor: color(fill),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        pixelOffset: new Cesium.Cartesian2(0, -8),
        scale: 0.9,
      },
    });
  }
  // Small category glyphs keep the spatial catalog identifiable without full names.
  function fusionGlyph(node, available) {
    const ink = available ? node.color : '#88969b';
    const shapes = {
      camera: '<rect x="3" y="7" width="13" height="11" rx="2"/><path d="M16 10l6-3v11l-6-3z"/>',
      plc: '<rect x="6" y="6" width="12" height="12" rx="1"/><path d="M3 8h3m-3 4h3m-3 4h3M18 8h3m-3 4h3m-3 4h3M8 3v3m4-3v3m4-3v3M8 18v3m4-3v3m4-3v3"/>',
      sensor: '<path d="M12 2l10 10-10 10L2 12z"/><circle cx="12" cy="12" r="3" fill="white"/>',
      network: '<path d="M2 8q10-10 20 0M6 12q6-6 12 0M10 16q2-2 4 0" fill="none" stroke-width="3"/><circle cx="12" cy="20" r="2"/>',
    };
    return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="-2 -2 28 28"><g fill="${ink}" stroke="white" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${shapes[node.type]}</g><g fill="${ink}" stroke="${ink}" stroke-width="1.5" stroke-linejoin="round">${shapes[node.type]}</g></svg>`)}`;
  }
  const fusionEntities = [];
  const fusionPackets = new Map();
  const fusionSourceLabels = new Map();
  let fusionSelected = null;
  function updateFusionLabelDetail() {
    const compact = container.clientWidth < 600;
    for (const [id, entity] of fusionSourceLabels) {
      entity.label.show = !compact || id === fusionSelected;
    }
    viewer.scene.requestRender();
  }
  let fusionVisible = false;
  function renderFusion(fusion) {
    for (const entity of fusionEntities) viewer.entities.remove(entity);
    fusionEntities.length = 0; fusionPackets.clear(); fusionSourceLabels.clear();
    fusionSelected = fusion?.selected;
    const wasVisible = fusionVisible;
    fusionVisible = Boolean(fusion?.visible);
    // The information layer has its own labels; physical geometry and original
    // camera pick targets remain mounted underneath and return to full labels off.
    for (const entity of viewer.entities.values) {
      if (entity.label && !entity.id.startsWith('fusion:') && entity.id !== 'proposal-label' && !/^(pickup:|drop:|protected-)/.test(entity.id)) entity.label.show = !fusionVisible;
    }
    if (!fusionVisible) { viewer.scene.requestRender(); return; }
    const add = options => { const entity=viewer.entities.add(options); fusionEntities.push(entity); return entity; };
    for (const source of fusionSources.filter(s=>s.available&&!fusion.excluded.includes(s.id))) {
      add({ id:`fusion-flow:${source.id}`, polyline: { positions:Array.from({length:33},(_,i)=>point(...fusionPathPoint(source.id,i/32))), width:fusion.selected===source.id||fusion.selected===source.network?3.2:1.5, material:color(source.color,.65), arcType:Cesium.ArcType.NONE } });
      for (let i=0;i<2;i++) {
        const packet=add({id:`fusion-packet:${source.id}-${i}`,position:point(...source.position),point:{pixelSize:7,color:color(source.color),outlineColor:color('#ffffff'),outlineWidth:1.5,disableDepthTestDistance:Infinity}});
        fusionPackets.set(`${source.id}-${i}`,packet);
      }
    }
    for (const node of [...fusionSources,...fusionNetworks,fusionHub]) {
      const available=node.available!==false&&!fusion.excluded.includes(node.id);
      const hub=node.type==='hub', network=node.type==='network';
      if(hub) {
        add({id:'fusion-glow:hub',position:point(...node.position),orientation:Cesium.Transforms.headingPitchRollQuaternion(point(...node.position),new Cesium.HeadingPitchRoll()),ellipsoid:{radii:new Cesium.Cartesian3(5.1,5.1,.2),material:color(node.color,.14),outline:true,outlineColor:color(node.color,.5)}});
        add({id:'fusion-ring:hub',position:point(...node.position),orientation:Cesium.Transforms.headingPitchRollQuaternion(point(...node.position),new Cesium.HeadingPitchRoll()),ellipsoid:{radii:new Cesium.Cartesian3(4.2,4.2,.13),material:color(node.color,.09),outline:true,outlineColor:color(node.color,.6)}});
      }
      if (hub) add({id:'fusion-core:hub',position:point(...node.position),ellipsoid:{radii:new Cesium.Cartesian3(2.1,2.1,2.1),material:color('#0a9584',.8),outline:true,outlineColor:color('#70d8c2')}});
      const label=hub?'seeo FUSION\nDIGITAL TWIN':network?(node.id==='AP-W'?'Wi-Fi West':'Wi-Fi East'):`${fusionSymbol(node)} ${node.id}${available?'': ' ×'}`;
      const nodeEntity = add({id:`fusion:${node.id}`,position:point(...node.position), label:{text:label,font:hub?'bold 17px sans-serif':'bold 11px sans-serif',fillColor:color(available?node.color:'#72828c'),showBackground:true,backgroundColor:color(fusion.selected===node.id?'#d4f3e8':'#ffffff',.94),backgroundPadding:new Cesium.Cartesian2(hub?12:7,hub?8:5),outlineColor:color('#ffffff'),outlineWidth:1,style:Cesium.LabelStyle.FILL_AND_OUTLINE,disableDepthTestDistance:Infinity,pixelOffset:new Cesium.Cartesian2(0,hub?-26:-21)},billboard:hub?undefined:{image:fusionGlyph(node,available),width:network?25:21,height:network?25:21,disableDepthTestDistance:Infinity}});
      if (!hub && !network) fusionSourceLabels.set(node.id, nodeEntity);
    }
    updateFusionLabelDetail();
    viewer.scene.requestRender();
    if(!wasVisible) fitSite();
  }
  function updateFusion(frame) {
    if(!fusionVisible)return;
    for (const packet of frame.packets) {
      const entity=fusionPackets.get(packet.id);
      if(entity) entity.position=point(...packet.position);
    }
    viewer.scene.requestRender();
  }
  function render(state) {
    fusionEntities.length=0;fusionPackets.clear();
    viewer.entities.removeAll();
    actorParts.clear();
    box("site-base", -2, -2, 118, 70, -1, 0.3, "#d1dce1");
    box("yard-slab", 85, 0, 30, 65, -0.6, 0.5, "#bac8d1");
    box("floor", 0, 0, 84, 54, -0.6, 0.5, "#dfe7eb");
    // Cutaway walls leave the interior visible. Heights are illustrative.
    box("wall-back", 0, 0, 84, 0.4, 0, 3, "#ffcc00");
    box("wall-left", 0, 0, 0.4, 54, 0, 3, "#ffcc00");
    for (const [index, [y, h]] of [
      [0, 24],
      [29, 6],
      [40, 6],
      [51, 3],
    ].entries())
      box(`wall-right:${index}`, 83.6, y, 0.4, h, 0, 3, "#ffcc00");
    if(state.flowMode === "proposed") {
      box("wall-front-west",0,53.6,41,.4,0,.6,"#ffcc00");
      box("wall-front-east",45,53.6,39,.4,0,.6,"#ffcc00");
      box("protected-access",42,51,2,6,.12,.04,"#b9e4d1");
      label("protected-gate","PEDESTRIAN ACCESS",43,55,.3,"#116958");
    } else box("wall-front", 0, 53.6, 84, 0.4, 0, 0.6, "#ffcc00");
    box("pitch-fascia",0,-.05,84,.5,2.15,.45,"#d40511");
    label("pitch-sign","DHL DC · CONCEPT",41,-2,3.8,"#b9000c");
    for (const area of areas) {
      box(
        `area:${area.id}`,
        area.x,
        area.y,
        area.w,
        area.h,
        0,
        0.08,
        area.id === "unknown"
          ? "#b9c2ca"
          : area.id === state.area
            ? "#b8ddd2"
            : "#eaf0f2",
      );
      label(`label:${area.id}`, state.flowMode === "proposed" && area.id === "crossing" ? "VEHICLE TRANSFER AREA" : area.name, area.x + area.w / 2, area.y + 3, 1);
    }
    for (const x of [7, 16, 25, 34])
      for (const y of [28, 39]) {
        box(`rack:${x}:${y}`, x, y, 5, 7, 0.1, 4.5, "#b51c2b");
        for (const h of [1.5, 3])
          box(
            `shelf:${x}:${y}:${h}`,
            x - 0.15,
            y - 0.1,
            5.3,
            7.2,
            h,
            0.15,
            "#ffcf32",
          );
        for (const h of [0.3, 1.7, 3.2])
          for (const dx of [0.5, 2.8])
            box(
              `pallet:${x}:${y}:${h}:${dx}`,
              x + dx,
              y + 0.7,
              1.7,
              5.2,
              h,
              0.9,
              "#bb9a76",
            );
      }
    for (const x of [32, 42, 52])
      box(`packing:${x}`, x, 10, 6, 3, 0.1, 1.2, "#ffcf32");
    box("receiving-conveyor", 8, 6.5, 14, 1.5, 0.2, 0.8, "#6c899c");
    for (let i=0;i<12;i++) box(`receiving-roller:${i}`,9+i,6.5,.12,1.5,1,.08,"#c8d6dc");
    box("conveyor", 28, 6.5, 32, 1.5, 0.2, 0.8, "#6c899c");
    for (let x = 29; x < 60; x += 1.5)
      box(`roller:${x}`, x, 6.5, 0.12, 1.5, 1, 0.07, "#b9ccd6");
    for (const x of [33, 41, 51])
      box(`conveyor-carton:${x}`, x, 6.7, 1.2, 1.1, 1.1, 0.7, "#c2a17a");
    box("employee-approach", 5, 56, 28, 10, -0.1, 0.15, "#a9cec1");
    line(
      "employee-route",
      [
        [12, 66, 0.15],
        [12, 57, 0.15],
        [43, 57, 0.15],
        [43, 51, 0.15],
      ],
      "#5d9a82",
      6,
    );
    label("employee-label", "EMPLOYEE ENTRANCE", 18, 60, 1);
    box("blind-spot", 19, 41, 5, 7, 0.12, 0.03, "#a6a5b7");
    for (let y = 41; y < 48; y += 1.2)
      line(
        `blind-stripe:${y}`,
        [
          [19, y, 0.2],
          [24, Math.min(48, y + 1), 0.2],
        ],
        "#ecebf1",
        1,
      );
    label("blind-label", "ILLUSTRATIVE BLIND SPOT", 23, 50, 0.6, "#64617d");
    for (const [index, y] of [24, 35, 46].entries()) {
      box(`dock:${index}`, 84, y, 13, 5, -0.25, 0.2, "#94aaba");
      label(`dock-label:${index}`, `BAY ${index + 1}`, 90.5, y + 2.5, 0.5);
      box(`dock-frame:${index}`, 83.9, y, 0.2, 0.2, 0, 3.7, "#d40511");
      box(
        `dock-frame-end:${index}`,
        83.9,
        y + 4.8,
        0.2,
        0.2,
        0,
        3.7,
        "#d40511",
      );
    }
    box("parked-trailer", 87, 15.7, 9, 2.6, 0.6, 2.9, "#ffcc00");
    box("yard-trailer-stripe",87,15.66,9,.05,1.5,.4,"#d40511");
    box("parked-cab", 96, 15.8, 2.4, 2.4, 0.5, 2.1, "#ffcc00");
    for (const y of [11, 21, 31, 41, 51])
      line(
        `yard-lane:${y}`,
        [
          [104, y, 0.05],
          [104, y + 4, 0.05],
        ],
        "#f9fafb",
        2,
      );
    label("yard-direction", "ONE WAY ↑", 106, 60, 0.5);
    if(state.flowMode === "original") {
    line(
      "walkway",
      [
        [3, 17.7, 0.2],
        [81, 17.7, 0.2],
      ],
      "#8eb9aa",
      10,
    );
    for (let i = 0; i < 8; i++)
      box(`stripe:${i}`, 50, 24 + i * 1.1, 10, 0.55, 0.12, 0.03, "#ffffff");
    }
    for (const camera of cameras) {
      box(
        `camera-pole:${camera.id}`,
        camera.x - 0.08,
        camera.y - 0.08,
        0.16,
        0.16,
        0,
        4,
        "#77909f",
      );
      viewer.entities.add({
        id: `camera:${camera.id}`,
        position: point(camera.x, camera.y, 4),
        point: {
          pixelSize: 11,
          color: color(camera.active ? "#237b87" : "#8798a4"),
          outlineWidth: 2,
          outlineColor: Cesium.Color.WHITE,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
      label(`camera-label:${camera.id}`, camera.id, camera.x, camera.y, 5);
      if (state.coverage && camera.active) {
        viewer.entities.add({
          id: `coverage:${camera.id}`,
          polygon: {
            hierarchy: new Cesium.PolygonHierarchy(
              camera.polygon.map((p) => point(p[0], p[1], 0.3)),
            ),
            perPositionHeight: true,
            material: color("#00a8d0", 0.3),
            outline: true,
            outlineColor: color("#2794b1", 0.7),
          },
        });
        for (const [i, p] of camera.polygon.slice(1).entries())
          line(
            `ray:${camera.id}:${i}`,
            [
              [camera.x, camera.y, 4],
              [p[0], p[1], 0.3],
            ],
            "#009fce",
            2.5,
          );
        line(
          `coverage-edge:${camera.id}`,
          [...camera.polygon, camera.polygon[0]].map((p) => [p[0], p[1], 0.32]),
          "#009fce",
          2.5,
        );
      }
    }
    if (state.events)
      for (const event of eventsInWindow(state.window)) {
        viewer.entities.add({
          id: `event:${event.id}`,
          position: point(event.x, event.y, 0.6),
          point: {
            pixelSize: 12,
            color: color("#d88637"),
            outlineWidth: 3,
            outlineColor: color("#fff"),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
      }
    if (state.proposal) {
      box("proposed-barrier-a", 47.7, 35, 0.6, 12, 0.1, 1.5, "#00a886");
      box("proposed-barrier-b", 47.7, 46.7, 11.3, 0.6, 0.1, 1.5, "#00a886");
      for (let y = 35; y <= 47; y += 2)
        box(`proposed-post:${y}`, 47.55, y, 0.9, 0.4, 0.1, 1.8, "#f0c84e");
      label(
        "proposal-label",
        "PROPOSED BARRIER · NOT VALIDATED",
        60,
        50,
        2,
        "#087f71",
      );
    }
    if(state.flowMode === "proposed") {
      for(const station of workStations.filter(s=>s.area === state.area)) {
        label(`pickup:${station.id}`,`${station.name} pickup`,...station.pickup,.5,"#af762a");
        label(`drop:${station.id}`,`${station.name} drop-off`,...station.drop,.5,"#147f85");
      }
      for(let i=1;i<pedestrianPath.length;i++) {
        const a=pedestrianPath[i-1],b=pedestrianPath[i];
        box(`protected-floor:${i}`,Math.min(a[0],b[0])-1,Math.min(a[1],b[1])-1,Math.abs(b[0]-a[0])+2,Math.abs(b[1]-a[1])+2,.12,.04,"#b9e4d1");
        const c=barrierPath[i-1],d=barrierPath[i];
        box(`protected-barrier:${i}`,Math.min(c[0],d[0])-.12,Math.min(c[1],d[1])-.12,Math.abs(d[0]-c[0])+.24,Math.abs(d[1]-c[1])+.24,.2,1,"#138c80");
        for(let t=0;t<=1;t+=.1) box(`protected-post:${i}:${t}`,c[0]+(d[0]-c[0])*t-.2,c[1]+(d[1]-c[1])*t-.2,.4,.4,.2,1.25,"#ffcc00");
      }
      label("protected-label","PROPOSED PROTECTED PERIMETER · UNVALIDATED",42,52,1,"#116958");
    }
    for (const route of state.flowMode === "proposed" ? facilityRoutes : routes) {
      line(
        `simulated-route:${route.id}`,
        route.points.map((p) => [p[1], p[2], 0.35]),
        route.color,
        1.5,
      );
      addActor(route);
    }
    updateFrame(getFacilityFrame(0,state.flowMode));
    renderFusion(state.fusion);
    viewer.scene.requestRender();
  }
  let scenarioFocus = null;
  let closeView = false,
    dockFocused = false;
  function reset() {
    closeView = false;
    scenarioFocus = null;
    dockFocused = false;
    fitSite();
  }
  function fitSite() {
    const width = container.clientWidth,
      height = container.clientHeight;
    if (width < 1 || height < 1) return;
    viewer.resize();
    const heading = Cesium.Math.toRadians(-23),
      pitch = Cesium.Math.toRadians(-57);
    const corners = [-59, 59].flatMap((x) =>
      [-36, 34].flatMap((y) => [-1, fusionVisible ? 16 : 7].map((z) => [x, y, z])),
    );
    const range = facilityFitBounds(
      corners,
      viewer.camera.frustum.fovy,
      width / height,
      heading,
      pitch,
    );
    viewer.camera.lookAt(
      origin,
      new Cesium.HeadingPitchRange(heading, pitch, range),
    );
    viewer.scene.requestRender();
  }
  function pickAt(position) {
    return resolveFacilityHits(
      viewer.scene.drillPick(position, 12).map((hit) => hit?.id?.id),
    );
  }
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction((click) => {
    const selection = pickAt(click.position);
    if (selection?.type === "fusion") selectFusion(selection.id);
    else if (selection?.type === "camera") openCamera(selection.id);
    else if (selection?.type === "area") selectArea(selection.id);
    else if (selection?.type === "event") openEvidence(selection.id);
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  handler.setInputAction((movement) => {
    viewer.scene.canvas.style.cursor = pickAt(movement.endPosition)
      ? "pointer"
      : "grab";
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  function closeUp() {
    scenarioFocus = null;
    dockFocused = false;
    closeView = true;

    viewer.camera.lookAt(
      point(55, 34, 0),
      new Cesium.HeadingPitchRange(
        Cesium.Math.toRadians(-35),
        Cesium.Math.toRadians(-35),
        15,
      ),
    );
    viewer.scene.requestRender();
  }
  function dockView() {
    scenarioFocus = null;
    dockFocused = true;

    closeView = false;
    viewer.resize();
    const heading = Cesium.Math.toRadians(65),
      pitch = Cesium.Math.toRadians(-45);
    const corners = [-15, 19].flatMap((x) =>
      [-32, 34].flatMap((y) => [0, 4].map((z) => [x, y, z])),
    );
    const range = facilityFitBounds(
      corners,
      viewer.camera.frustum.fovy,
      container.clientWidth / container.clientHeight,
      heading,
      pitch,
    );
    viewer.camera.lookAt(
      point(97, 33, 0),
      new Cesium.HeadingPitchRange(heading, pitch, Math.max(40, range)),
    );

    viewer.scene.requestRender();
  }
  function focusScenario(id) {
    scenarioFocus = id;
    closeView = false;
    dockFocused = false;
    const targets = {
      storage: [14, 34],
      dispatch: [73, 34],
      packing: [44, 14],
    };
    const [x, y] = targets[id] || [55, 34];
    viewer.camera.lookAt(
      point(x, y, 0),
      new Cesium.HeadingPitchRange(
        Cesium.Math.toRadians(-25),
        Cesium.Math.toRadians(-50),
        38,
      ),
    );
    viewer.scene.requestRender();
  }
  function captureView() {
    return {
      position: Cesium.Cartesian3.clone(viewer.camera.positionWC),
      direction: Cesium.Cartesian3.clone(viewer.camera.directionWC),
      up: Cesium.Cartesian3.clone(viewer.camera.upWC),
      transform: Cesium.Matrix4.clone(viewer.camera.transform),
      scenarioFocus, closeView, dockFocused,
    };
  }
  function restoreView(pose) {
    if (!pose) return;
    ({scenarioFocus, closeView, dockFocused} = pose);
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    viewer.camera.setView({destination: pose.position, orientation: {direction: pose.direction, up: pose.up}});
    viewer.camera.lookAtTransform(pose.transform);
    viewer.scene.requestRender();
  }
  const observer = new ResizeObserver(() => {
    updateFusionLabelDetail();
    if (scenarioFocus) focusScenario(scenarioFocus);
    else if (dockFocused) dockView();
    else if (closeView) closeUp();
    else fitSite();
  });
  observer.observe(container);
  reset();
  return {
    render,
    updateFrame,
    renderFusion,
    updateFusion,
    closeUp,
    dockView,
    focusScenario,
    reset,
    captureView,
    restoreView,
    resize: () => {
      viewer.resize();
      reset();
    },
  };
}
