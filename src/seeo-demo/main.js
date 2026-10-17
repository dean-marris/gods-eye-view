import { fusionFrame, fusionSnapshot } from "./fusion.js";
import { fusionPlanMarkup, fusionDetailsMarkup } from "./fusion-view.js";
import { areaViews, cameraArea } from "./areaViews.js";
import { areaImages } from "./areaImages.js";
import "./style.css";
import { areas, cameras, events, eventsInWindow, areaCamera } from "./data.js";
import {
  getReplayFrame,
  initialReplay,
  reduceReplay,
  REPLAY_EVENT_TIME,
} from "./replay.js";
import {
  actorMarkup,
  routeMarkup,
  evidenceReplayMarkup,
} from "./replayVisual.js";

let replay = initialReplay();
let animationId;
let lastAnimationTime;

const state = {
  area: "crossing",
  window: "shift",
  events: true,
  coverage: false,
  proposal: false,
  view: "plan",
  step: "overview",
};
const fusion = { visible: true, paused: false, selected: 'hub', excluded: [] };
let flowTime = 0, flowRaf, flowLast, fusionDetailsTime = -1;
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let model;
let modelLoading = false;
const $ = (id) => document.getElementById(id);

function updateReplay() {
  const frame = getReplayFrame(replay.seconds);
  const clock = `00:${replay.seconds.toFixed(1).padStart(4, "0")} / 00:40`;
  if ($("replay-actors")) $("replay-actors").innerHTML = actorMarkup(frame);
  $("replay-time").value = String(replay.seconds);
  $("replay-time").setAttribute(
    "aria-valuetext",
    `${replay.seconds.toFixed(1)} seconds of 40, simulated`,
  );
  $("replay-clock").textContent = clock;
  $("replay-play").textContent = replay.playing ? "Ⅱ Pause" : "▶ Play";
  $("replay-play").setAttribute(
    "aria-label",
    replay.playing ? "Pause simulated replay" : "Play simulated replay",
  );
  $("replay-speed").value = String(replay.speed);
  const phases = {
    approach: "Approaching the crossing",
    crossing: "Crossing interaction · simulated",
    clear: "Routes clear the crossing",
  };
  $("replay-phase").textContent = phases[frame.phase];
  const truck = frame.actors.find((actor) => actor.id === "TR-01");
  $("truck-status").textContent =
    `SIMULATED · Truck & trailer · ${truck.motion === "positioning" ? "Positioning for Bay 1" : truck.motion === "reversing" ? "REVERSING into Bay 1" : "Docked at Bay 1"} · authored manoeuvre`;
  $("replay-phase").dataset.phase = frame.phase;
  $("replay-separation").textContent =
    `Model-space separation: ${frame.separation.toFixed(1)} m · synthetic`;
  if ($("evidence-replay-actors")) {
    $("evidence-replay-actors").innerHTML = actorMarkup(frame, true);
    $("evidence-replay-time").value = String(replay.seconds);
    $("evidence-replay-clock").textContent = clock;
    $("evidence-replay-play").textContent = replay.playing
      ? "Ⅱ Pause simulation"
      : "▶ Play simulation";
  }
  if (state.view === "model") model?.updateFrame(frame);
  if ($( "fusion-context-text")) { updateFusionReadings(fusionSnapshot(replay.seconds, fusion.excluded)); }
}

function animateReplay(now) {
  const elapsed =
    lastAnimationTime === undefined
      ? 0
      : Math.max(0, (now - lastAnimationTime) / 1000);
  lastAnimationTime = now;
  replay = reduceReplay(replay, { type: "tick", seconds: elapsed });
  updateReplay();
  animationId = replay.playing
    ? requestAnimationFrame(animateReplay)
    : undefined;
  if (!replay.playing) lastAnimationTime = undefined;
}

function dispatchReplay(action) {
  replay = reduceReplay(replay, action);
  if (!replay.playing && animationId !== undefined) {
    cancelAnimationFrame(animationId);
    animationId = undefined;
    lastAnimationTime = undefined;
  }
  updateReplay();
  if (replay.playing && animationId === undefined) {
    lastAnimationTime = performance.now();
    animationId = requestAnimationFrame(animateReplay);
  }
}

function togglePlayback() {
  dispatchReplay({ type: replay.playing ? "pause" : "play" });
}
const stories = {
  overview: [
    "Find a recurring interaction.",
    "The dispatch crossing has repeated sample interactions. Select it to see the associated events and camera context.",
  ],
  evidence: [
    "Connect the location to its evidence.",
    "Each event opens a labelled schematic with its area, camera and illustrative policy. There is no recorded footage in this prototype.",
  ],
  coverage: [
    "See the limits of the monitoring.",
    "C03’s estimated view is shown in cyan beside an illustrative rack blind spot. Select C04 to inspect unavailable monitoring. Coverage is estimated, not validated.",
  ],
  proposal: [
    "Review an intervention before measuring it.",
    "The proposed barrier separates a short section of walkway. It changes the layout only. The historical sample events remain visible; no reduction in risk is predicted.",
  ],
};

function selectArea(id) {
  if (!areas.some((area) => area.id === id)) return;
  state.area = id;
  render();
}

function planMarkup() {
  const visible = eventsInWindow(state.window);
  return `<svg viewBox="-4 -6 122 80" role="group" aria-label="Fictional distribution centre warehouse and truck yard">
    <defs><pattern id="grid" width="2" height="2" patternUnits="userSpaceOnUse"><path d="M 2 0 L 0 0 0 2" fill="none" stroke="#e1e8eb" stroke-width=".08"/></pattern><pattern id="hatch" width="1.1" height="1.1" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="1.1" stroke="#b7c2c8" stroke-width=".22"/></pattern></defs>
    <rect x="-4" y="-6" width="122" height="80" fill="url(#grid)"/>
    <rect x="85" y="0" width="30" height="65" rx="1" fill="#dce3e7" stroke="#b0bdc7" stroke-width=".3"/>
    <path d="M104 60V8" stroke="#fff" stroke-width=".2" stroke-dasharray="1 1"/>
    <rect x="0" y="0" width="84" height="54" rx=".5" fill="#fff" stroke="#aebec8" stroke-width=".5"/>
    <path d="M 26 0 V 16 M 63.5 0 V 16" stroke="#b3c1c9" stroke-width=".5"/>
    <path d="M 3 17.7 H 81 M 46.5 18 V 51" stroke="#d8e6e3" stroke-width="1.6"/>
    <path d="M 3 17.7 H 81" stroke="#fff" stroke-width=".15" stroke-dasharray="1 1"/>
    ${areas
      .map((area) => {
        const selected = area.id === state.area;
        const count = visible.filter((event) => event.area === area.id).length;
        return `<g class="svg-area" role="button" tabindex="0" data-area="${area.id}" aria-label="${area.name}${area.id === "unknown" ? ", unmonitored" : `, ${count} sample event${count === 1 ? "" : "s"}`}" aria-pressed="${selected}"><rect class="area-floor" x="${area.x}" y="${area.y}" width="${area.w}" height="${area.h}" rx=".4" fill="${area.id === "unknown" ? "#edf0f2" : selected ? "#e3f2ed" : area.id === "yard" ? "#dce3e7" : "#f6f8f9"}" stroke="${selected ? "#138c80" : "#dce4e8"}" stroke-width="${selected ? ".55" : ".2"}"/>${area.id === "unknown" ? `<rect x="${area.x}" y="${area.y}" width="${area.w}" height="${area.h}" fill="url(#hatch)" opacity=".5"/>` : ""}<text class="svg-label" x="${area.x + 1.5}" y="${area.y + 3.1}">${area.name}</text><text class="svg-secondary" x="${area.x + 1.5}" y="${area.y + 5.1}">${area.id === "unknown" ? "Monitoring unavailable" : `${count} sample event${count === 1 ? "" : "s"}`}</text></g>`;
      })
      .join("")}
    ${[7, 16, 25, 34].flatMap((x) => [28, 39].map((y) => `<g pointer-events="none"><rect x="${x}" y="${y}" width="5" height="7" rx=".25" fill="#dce4e9" stroke="#adbdc8" stroke-width=".2"/><path d="M${x + 1} ${y + 0.5}V${y + 6.5}M${x + 2.5} ${y + 0.5}V${y + 6.5}M${x + 4} ${y + 0.5}V${y + 6.5}" stroke="#bccbd5" stroke-width=".18"/></g>`)).join("")}
    <g pointer-events="none"><rect x="8" y="6.5" width="14" height="1.5" fill="#8fa7b4"/>${Array.from({length:12},(_,i)=>`<path d="M${9+i} 6.5V8" stroke="#d5e2e7" stroke-width=".2"/>`).join('')}</g>
    ${[32, 42, 52].map((x) => `<rect x="${x}" y="10" width="6" height="3" rx=".2" fill="#d8e1e6" pointer-events="none"/>`).join("")}
    <g pointer-events="none"><rect x="28" y="6.5" width="32" height="1.5" fill="#8fa7b4"/>${Array.from({ length: 28 }, (_, i) => `<path d="M${29 + i} 6.5V8" stroke="#d5e2e7" stroke-width=".2"/>`).join("")}<rect x="5" y="56" width="28" height="10" rx=".4" fill="#e3ede9"/><path d="M12 66V57H43V51" fill="none" stroke="#8fb9aa" stroke-width="1.6"/><text x="6" y="60" class="svg-label">Employee entrance</text><text x="6" y="62.5" class="svg-secondary">Separate pedestrian approach</text><rect x="19" y="41" width="5" height="7" fill="url(#hatch)" opacity=".85"/><text x="5" y="51" class="svg-secondary">Hatched patch: illustrative rack blind spot</text>${[24, 35, 46].map((y, i) => `<rect x="84" y="${y}" width="13" height="5" fill="#b8c8d1" stroke="#fff" stroke-width=".2"/><text x="90" y="${y + 3}" text-anchor="middle" class="svg-secondary">BAY ${i + 1}</text>`).join("")}<g transform="translate(95 17)"><rect x="-4" y="-1.25" width="7" height="2.5" fill="#8a9aa9"/><rect x="3" y="-1.1" width="2" height="2.2" fill="#526c80"/></g><text x="109" y="61" text-anchor="middle" class="svg-secondary">↑ ONE WAY</text></g>
    <path d="M50 22 V48 M60 22 V48" stroke="#c1ceca" stroke-width=".25" stroke-dasharray="1 1" pointer-events="none"/>
    <g fill="#fff" pointer-events="none">${Array.from({ length: 8 }, (_, i) => `<rect x="50" y="${24 + i * 1.1}" width="10" height=".55"/>`).join("")}</g>
    <text x="55" y="46" text-anchor="middle" class="svg-secondary" transform="rotate(-90 55 46)">PEDESTRIAN CROSSING</text>
    ${[24, 35, 46].map((y) => `<path d="M83.5 ${y}h-1v5h1" fill="#cbd8de" stroke="#8ea4b2" stroke-width=".25"/>`).join("")}
    ${
      state.coverage
        ? cameras
            .filter((c) => c.active)
            .map(
              (camera) =>
                `<polygon points="${camera.polygon.map((p) => p.join(",")).join(" ")}" fill="#2089a51a" stroke="#2887a6" stroke-width=".25" stroke-dasharray="1 .6" pointer-events="none"/>`,
            )
            .join("")
        : ""
    }
    ${state.proposal ? `<g pointer-events="none"><path d="M48 35 V47 H59" fill="none" stroke="#168b7c" stroke-width=".8" stroke-dasharray="1 .4"/><rect x="48" y="50" width="26" height="2.7" rx=".4" fill="#d7eee6"/><text x="49" y="51.8" font-size="1.15" fill="#116958">PROPOSED BARRIER · UNVALIDATED</text></g>` : ""}
    ${state.events ? visible.map((event) => `<g class="svg-event" role="button" tabindex="0" data-event="${event.id}" aria-label="Open sample ${event.id}, ${event.time}, ${event.type}"><circle cx="${event.x}" cy="${event.y}" r="1.3" fill="#e8a153" fill-opacity=".2"/><circle cx="${event.x}" cy="${event.y}" r=".6" fill="#d88637" stroke="#fff" stroke-width=".2"/></g>`).join("") : ""}
    ${cameras.map((camera) => `<g class="svg-camera" role="button" tabindex="0" data-camera="${camera.id}" aria-label="${camera.id}, ${camera.name}, ${camera.active ? "synthetic camera" : "monitoring unavailable"}"><rect x="${camera.x - 1.5}" y="${camera.y - 1.1}" width="3" height="2.2" rx=".4" fill="${camera.active ? "#237b87" : "#8f9fa8"}" stroke="#fff" stroke-width=".25"/><text x="${camera.x}" y="${camera.y + 0.45}" text-anchor="middle" fill="#fff" font-size="1.15">${camera.id}</text></g>`).join("")}
    ${routeMarkup()}<g id="replay-actors">${actorMarkup(getReplayFrame(replay.seconds))}</g>
    ${fusionPlanMarkup(fusion)}
    <g pointer-events="none"><path d="M1 70H11M1 69V71M11 69V71" stroke="#778d9b" stroke-width=".2"/><text x="6" y="69" text-anchor="middle" class="svg-secondary">10 m</text><text x="111" y="-2" class="svg-label">N ↑</text><text x="2" y="-2" class="svg-secondary">EXAMPLE LOGISTICS · FICTIONAL SITE · SIMULATED ROUTES</text></g>
  </svg>`;
}

function renderDetails() {
  const area = areas.find((area) => area.id === state.area);
  const camera = areaCamera(area.id);
  const related = eventsInWindow(state.window).filter(
    (event) => event.area === area.id,
  );
  const unknown = !camera.active;
  $("details").innerHTML =
    `<div class="area-eyebrow"><p class="eyebrow">SELECTED AREA</p><span>ILLUSTRATIVE</span></div><h2 class="area-title">${area.name}</h2><p class="area-description">${area.description}</p><div class="metric-row"><strong class="metric-number" style="${unknown ? "color:#7d8b96" : ""}">${unknown ? "—" : related.length}</strong><div><p>${unknown ? "Conditions unknown" : "Sample events in this window"}</p><small>${unknown ? "No available monitoring" : "Fixture counts · not a risk score"}</small></div></div><section class="detail-section"><div class="section-label"><h3>Camera & policy</h3><span>Demo configuration</span></div><div class="camera-card"><strong><i class="status-dot ${unknown ? "offline" : ""}"></i>${camera.id} · ${camera.name}</strong><button class="area-image-preview" data-area-image="${area.id}" aria-label="Open ${area.name} image"><img src="${areaImages[area.id]}" alt="Synthetic ${area.name} camera illustration" loading="lazy"/><span>Open ${area.name} image ↗</span></button><div class="camera-meta"><span>Feed</span><span>${unknown ? "Unavailable" : "Synthetic · no live video"}</span><span>Distance rule</span><span>${camera.threshold === null ? "Unavailable" : `${camera.threshold.toFixed(1)} m · example`}</span><span>Analytics validation</span><span>Not established</span></div></div><p class="inline-note">${unknown ? "No events shown here does not establish safe conditions." : "An estimated field of view is not proof of reliable detection throughout this area."}</p></section><section class="detail-section"><div class="section-label"><h3>Associated sample events</h3><span>${unknown ? "Unavailable" : related.length}</span></div><div class="event-list">${unknown ? '<div class="empty-state">Monitoring unavailable.<br>Survey this area before making a coverage claim.</div>' : related.length ? related.map((event) => `<button class="event-button" data-event="${event.id}"><strong>${event.time}</strong><span>${event.type}<small>${event.id} · schematic evidence only</small></span><span>↗</span></button>`).join("") : '<div class="empty-state">No sample events in this window. Choose Full shift to inspect the other fixtures.</div>'}</div></section>${state.proposal ? '<div class="proposal-note"><strong>Proposed change</strong><br>Add a short barrier beside the crossing. Layout sketch only; sightlines, access and operational suitability need review. No outcome is predicted.<br><a data-analysis href="./dispatch-comparison.html' + (location.pathname.endsWith("seeo-demo.html") ? "?from=local" : "") + '">Test a change with calculated dispatch results ↗</a></div>' : ""}`;
}

function render() {
  $("plan").innerHTML = planMarkup();
  renderDetails();
  renderFusionDetails();
  if (["crossing", "dispatch"].includes(state.area)) {
    const entry = document.createElement("button");
    entry.type = "button"; entry.className = "primary-button analysis-entry";
    entry.setAttribute("data-analysis", "");
    entry.textContent = "Compare loading & crossing ↗";
    $("details").prepend(entry);
  }
  $("timeline").innerHTML = events
    .map(
      (event) =>
        `<button data-event="${event.id}" class="${event.area === state.area ? "selected" : ""} ${eventsInWindow(state.window).includes(event) ? "" : "dimmed"}" style="left:${(event.minutes / 480) * 100}%" aria-label="Sample ${event.id}, ${event.time}, ${event.type}" title="${event.time} · ${event.type}"></button>`,
    )
    .join("");
  document
    .querySelectorAll("[data-window]")
    .forEach((button) =>
      button.classList.toggle("active", button.dataset.window === state.window),
    );
  $("window-label").textContent =
    state.window === "shift"
      ? "Full shift"
      : state.window === "morning"
        ? "06:00–10:00"
        : "10:00–14:00";
  for (const key of ["events", "coverage", "proposal"])
    $(`show-${key}`).checked = state[key];
  document.querySelectorAll("[data-step]").forEach((button) => {
    button.classList.toggle("active", button.dataset.step === state.step);
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.step === state.step),
    );
  });
  const [title, copy] = stories[state.step];
  $("story-title").textContent = title;
  $("story-copy").textContent = copy;
  model?.render({...state, fusion});
  syncFusion();
  $("layer-status").textContent =
    `Event markers ${state.events ? "on" : "off"} · Camera estimates ${state.coverage ? "on (cyan)" : "off"} · Proposed barrier ${state.proposal ? "on (green/yellow)" : "off"}`;
  updateReplay();
}

function openEvidence(id) {
  const event = events.find((event) => event.id === id);
  if (!event) return;
  if (event.replaySeconds !== undefined)
    replay = reduceReplay(replay, {
      type: "seek",
      seconds: event.replaySeconds,
    });
  else replay = reduceReplay(replay, { type: "pause" });
  state.area = event.area;
  render();
  $("evidence-title").textContent = `${event.time} · ${event.type}`;
  const camera = cameras.find((camera) => camera.id === event.camera);
  $("evidence-content").innerHTML =
    `<div class="evidence-visual"><div class="evidence-watermark">ILLUSTRATIVE SCHEMATIC · NOT CAMERA FOOTAGE</div><svg viewBox="0 0 600 250" aria-label="Illustrative forklift and pedestrian routes, not recorded footage"><rect width="600" height="250" fill="#163344"/><path d="M0 175H600" stroke="#355462" stroke-width="65"/><path d="M335 65V250" stroke="#304f5c" stroke-width="65"/><path d="M0 175H600" stroke="#7b9199" stroke-dasharray="10 10"/><path d="M335 65V250" stroke="#7b9199" stroke-dasharray="10 10"/><path d="M80 175H290" stroke="#e4ac64" stroke-width="3" stroke-dasharray="7 5"/><path d="M335 90V145" stroke="#74cbb9" stroke-width="3" stroke-dasharray="7 5"/><rect x="268" y="157" width="38" height="30" rx="4" fill="#e5aa5b"/><path d="M306 165h17m-17 14h17" stroke="#e5aa5b" stroke-width="4"/><circle cx="335" cy="135" r="10" fill="#7cd3bb"/><circle cx="318" cy="162" r="40" fill="none" stroke="#e6ad61" stroke-dasharray="4 5"/><text x="35" y="225" fill="#b3c4ca" font-size="11">Synthetic trajectories · no measured separation · no cross-camera association</text></svg></div><div class="evidence-facts"><div><small>AREA</small><strong>${areas.find((area) => area.id === event.area).name}</strong></div><div><small>CAMERA / EVENT</small><strong>${event.camera} / ${event.id}</strong></div><div><small>EXAMPLE DISTANCE RULE</small><strong>${camera.threshold === null ? "Unavailable" : `${camera.threshold.toFixed(1)} m`}</strong></div></div><p class="evidence-details">${event.note} This fixture demonstrates navigation from a location to an evidence record. It is not a validated detector result or an actual incident.</p><div class="inline-note">Real evidence will need an approved clip, timestamps, camera identity and the policy version active when the event occurred. This prototype does not connect to seeo services.</div>`;
  if (event.replaySeconds !== undefined) {
    const visual = $("evidence-content").querySelector(".evidence-visual");
    visual.outerHTML = evidenceReplayMarkup(getReplayFrame(replay.seconds));
    $("evidence-replay-play").addEventListener("click", togglePlayback);
    $("evidence-replay-time").addEventListener("input", (event) =>
      dispatchReplay({ type: "seek", seconds: Number(event.target.value) }),
    );
    updateReplay();
  }
  if (!$("evidence-dialog").open) $("evidence-dialog").showModal();
}

document.addEventListener("click", (event) => {
  const target = event.target.closest(
    "[data-fusion],[data-analysis],[data-area-image],[data-area],[data-event],[data-camera],[data-window],[data-step]",
  );
  if (!target) return;
  if (target.dataset.fusion) selectFusion(target.dataset.fusion);
  else if (target.hasAttribute("data-analysis")) { event.preventDefault(); openAnalysis(target); }
  else if (target.dataset.areaImage) openAreaImage(target.dataset.areaImage);
  else if (target.dataset.area) openAreaImage(target.dataset.area);
  else if (target.dataset.event) openEvidence(target.dataset.event);
  else if (target.dataset.camera) openCamera(target.dataset.camera);
  else if (target.dataset.window) {
    state.window = target.dataset.window;
    render();
  } else if (target.dataset.step) {
    if (target.dataset.step === "proposal") { openAnalysis(target); return; }
    state.step = target.dataset.step;
    state.area = state.step === "coverage" ? "storage" : "crossing";
    state.coverage = state.step === "coverage";
    state.proposal = state.step === "proposal";
    state.window = "shift";
    render();
    if (state.view === "model") {
      model?.reset();
    }
    if (state.step === "evidence") openEvidence("EX-003");

  }
});
document.addEventListener("keydown", (event) => {
  if (
    (event.key === "Enter" || event.key === " ") &&
    event.target.matches('svg [role="button"]')
  ) {
    event.preventDefault();
    event.target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }
});
for (const key of ["events", "coverage", "proposal"])
  $(`show-${key}`).addEventListener("change", (event) => {
    state[key] = event.target.checked;
    render();
    if (state.view === "model" && state[key]) {
      if (key === "coverage" || key === "proposal") model?.reset();
    }
  });
for (const id of ["close-evidence", "evidence-done"])
  $(id).addEventListener("click", () => $("evidence-dialog").close());

async function setView(view) {
  if (view === "model" && modelLoading) return;
  state.view = view;
  $("plan").hidden = view !== "plan";
  $("model").hidden = view !== "model";
  for (const id of ["plan", "model"]) {
    $(`${id}-view`).classList.toggle("active", id === view);
    $(`${id}-view`).setAttribute("aria-pressed", String(id === view));
  }
  syncFusion();
  if (view === "plan") {
    $("model-status").hidden = true;
    return;
  }
  if (!model) {
    modelLoading = true;
    $("model-status").hidden = false;
    $("model-status").textContent = "Opening the illustrative 3D model…";
    try {
      const { createFacilityModel } = await import("./model.js");
      model = createFacilityModel($("model"), {
        selectArea: openAreaImage,
        openEvidence,
        openCamera,
        selectFusion,
      });
      model.render({...state, fusion});
      syncFusion();
      updateReplay();
      $("model-status").hidden = true;
    } catch (error) {
      $("model-status").textContent =
        "3D view is unavailable in this browser. Select Plan to continue exploring the scenario.";
      console.warn("seeo prototype 3D unavailable:", error);
    } finally {
      modelLoading = false;
    }
  } else {
    model.resize();
    model.render({...state, fusion});
    syncFusion();
    updateReplay();
  }
}
$("plan-view").addEventListener("click", () => setView("plan"));
$("model-view").addEventListener("click", () => setView("model"));
$("reset-view").addEventListener("click", () => {
  state.area = "crossing";
  render();
  if (state.view === "model") model?.reset();
});
$("replay-play").addEventListener("click", togglePlayback);
$("replay-reset").addEventListener("click", () =>
  dispatchReplay({ type: "reset" }),
);
$("replay-event").addEventListener("click", () => {
  state.area = "crossing";
  render();
  dispatchReplay({ type: "seek", seconds: REPLAY_EVENT_TIME });
});
$("replay-time").addEventListener("input", (event) =>
  dispatchReplay({ type: "seek", seconds: Number(event.target.value) }),
);
$("replay-speed").addEventListener("change", (event) =>
  dispatchReplay({ type: "speed", speed: Number(event.target.value) }),
);
$("evidence-dialog").addEventListener("close", () =>
  dispatchReplay({ type: "pause" }),
);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) dispatchReplay({ type: "pause" });
});
render();

function fusionCanMove() {
 return fusion.visible && !fusion.paused && !motionPreference.matches && !document.hidden && !document.querySelector('dialog[open]');
}
function renderFusionDetails() {
 $('fusion-details').hidden = !fusion.visible;
 $('fusion-details').innerHTML = fusionDetailsMarkup(fusion, replay.seconds);
 $('fusion-include')?.addEventListener('click', () => {
  fusion.excluded = fusion.excluded.includes(fusion.selected) ? fusion.excluded.filter(id=>id!==fusion.selected) : [...fusion.excluded,fusion.selected];
  refreshFusion();
 });
 $('fusion-whole').addEventListener('click',()=>{ $('reset-view').click(); });
}
function updateFusionReadings(snapshot) {
 if (!$('fusion-context-text')) return;
 $('fusion-context-text').textContent = snapshot.context;
 $('fusion-context-text').closest('.fusion-context').classList.toggle('incomplete', !snapshot.complete);
 $('fusion-context-text').previousElementSibling.textContent = `EXAMPLE FUSED DOCK CONTEXT · ${snapshot.time.toFixed(1)} s`;
 $('fusion-contributions').innerHTML = snapshot.contributions.map(c=>`<li>${c.type.toUpperCase()} ${c.id}: ${c.included?c.signal:'missing input · excluded'}</li>`).join('');
 const source=snapshot.sources.find(s=>s.id===fusion.selected);
 if(source&&$('fusion-source-reading')) { $('fusion-source-reading').textContent=source.signal; $('fusion-source-time').textContent=snapshot.time.toFixed(1); }
}
function paintFusion() {
 const frame = fusionFrame(replay.seconds, flowTime, fusion.excluded);
 if (state.view === 'plan') for (const packet of frame.packets) {
  const circle=document.querySelector(`[data-fusion-packet="${packet.id}"]`);
  if(circle) {circle.setAttribute('cx',packet.position[0]);circle.setAttribute('cy',packet.position[1]);}
 }
 else model?.updateFusion(frame);
 if (Math.abs(replay.seconds-fusionDetailsTime)>.15) {updateFusionReadings(frame);fusionDetailsTime=replay.seconds;}
}
function flowTick(now) {
 flowRaf=undefined;
 if (!fusionCanMove()) {flowLast=undefined;return;}
 flowTime += flowLast===undefined?0:Math.min(.1,(now-flowLast)/1000);
 flowLast=now;
 paintFusion();
 flowRaf=requestAnimationFrame(flowTick);
}
function syncFusion() {
 if(flowRaf!==undefined) cancelAnimationFrame(flowRaf);
 flowRaf=undefined;flowLast=undefined;
 $('fusion-pause').textContent=fusion.paused?'▶ Resume flow':'Ⅱ Pause flow';
 $('fusion-pause').setAttribute('aria-pressed',String(fusion.paused));
 $('fusion-pause').disabled=!fusion.visible;
 $('fusion-motion-status').textContent=!fusion.visible?'FUSION LAYER OFF':motionPreference.matches?'REDUCED MOTION · STATIC LINKS':fusionCanMove()?'SIMULATED CONNECTIONS · INWARD FLOW':'SIMULATED CONNECTIONS · FLOW PAUSED';
 paintFusion();
 if(fusionCanMove()) flowRaf=requestAnimationFrame(flowTick);
}
function refreshFusion() {
 const listOpen = $('fusion-details').querySelector('.fusion-source-list')?.open;
 const focused = document.activeElement;
 const focusedSource = focused?.dataset?.fusion;
 const focusedInList = focused?.closest?.('.fusion-source-list');
 const focusedInPlan = focused?.closest?.('#plan');
 const focusedInclude = focused?.id === 'fusion-include';
 $('plan').innerHTML=planMarkup();
 renderFusionDetails();
 if(listOpen) $('fusion-details').querySelector('.fusion-source-list').open=true;
 if(focusedSource && (focusedInList || focusedInPlan)) {
  const owner=focusedInList ? $('fusion-details') : $('plan');
  owner.querySelector(`[data-fusion="${focusedSource}"]`)?.focus({preventScroll:true});
 }
 if(focusedInclude) $('fusion-include')?.focus({preventScroll:true});
 model?.renderFusion(fusion);
 syncFusion();
}
function selectFusion(id) {
 const expanded=document.body.classList.contains('view-expanded');
 const fromInspector=$('fusion-details').contains(document.activeElement);
 fusion.selected=id;
 if(expanded) setExpandedView(false);
 refreshFusion();
 const inspector=$('fusion-details');
 inspector.closest('.detail-panel').scrollTop=0;
 if(expanded || (window.innerWidth<=820 && !fromInspector)) {
  inspector.setAttribute('tabindex','-1');
  inspector.scrollIntoView({block:'nearest'});
  inspector.focus({preventScroll:true});
 }
}
$('fusion-visible').addEventListener('change',event=>{fusion.visible=event.target.checked;refreshFusion();});
$('fusion-pause').addEventListener('click',()=>{fusion.paused=!fusion.paused;syncFusion();});
motionPreference.addEventListener('change',syncFusion);
document.addEventListener('visibilitychange',syncFusion);
new MutationObserver(syncFusion).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
window.addEventListener('pageshow', event=>{if(event.persisted)syncFusion();});
window.addEventListener('pagehide',()=>{if(flowRaf!==undefined)cancelAnimationFrame(flowRaf);flowRaf=undefined;});

function setExpandedView(expanded) {
  document
    .querySelector(".map-panel")
    .classList.toggle("expanded-view", expanded);
  document.body.classList.toggle("view-expanded", expanded);
  $("expand-view").textContent = expanded
    ? "Close expanded view"
    : "Expand view";
  $("expand-view").setAttribute("aria-pressed", String(expanded));
}
$("expand-view").addEventListener("click", () => {
  setExpandedView(!document.body.classList.contains("view-expanded"));
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$("analysis-dialog").open) setExpandedView(false);
});

$("crossing-view").addEventListener("click", async () => {
  await setView("model");
  model?.closeUp();
});

$("dock-view").addEventListener("click", async () => {
  await setView("model");
  model?.dockView();
  dispatchReplay({ type: "seek", seconds: 12 });
  dispatchReplay({ type: "play" });
});

function openCamera(id) {
  const areaId = cameraArea(id, state.area);
  if (areaId) openAreaImage(areaId);
}
function openAreaImage(id) {
  const area = areas.find((area) => area.id === id),
    view = areaViews[id];
  if (!area || !view) return;
  dispatchReplay({ type: "pause" });
  selectArea(id);
  $("camera-title").textContent = `${area.name} · ${area.camera}`;
  $("camera-content").innerHTML =
    `<nav class="area-image-nav" aria-label="Area images">${areas.map((item) => `<button data-area-image="${item.id}" aria-pressed="${item.id === id}">Show ${item.name} image</button>`).join("")}</nav>${id === "unknown" ? '<p class="inline-note"><strong>Monitoring unavailable.</strong> This generated concept image is not a camera feed and does not establish conditions in the rear service area.</p>' : ""}<figure><img src="${areaImages[id]}" alt="AI-generated ${area.name} camera illustration"/><figcaption>SYNTHETIC DEMO IMAGE · AI-generated static illustration. Not live footage or recorded evidence. This is a concept view, not an exact reconstruction of the 3D model. The replay time does not change the image.</figcaption></figure><p>${view.description}</p>${id === "yard" ? '<button class="primary-button" id="camera-dock-replay">Watch simulated truck docking</button>' : ""}`;
  if (!$("camera-dialog").open) $("camera-dialog").showModal();
  $("camera-dock-replay")?.addEventListener("click", () => {
    $("camera-dialog").close();
    $("dock-view").click();
  });
}
$("close-camera").addEventListener("click", () => $("camera-dialog").close());
$("camera-done").addEventListener("click", () => $("camera-dialog").close());
const scenarios = {
  busy: {
    time: 0,
    area: "crossing",
    title: "Busy shift · four forklifts, seven people and the docking truck",
  },
  aisle: {
    time: 16,
    area: "storage",
    title: "Aisle traffic · replenishment forklift and picker between racks",
  },
  dispatch: {
    time: 28,
    area: "dispatch",
    title: "Dispatch staging · outbound forklift and loading-bay checker",
  },
  packing: {
    time: 12,
    area: "packing",
    title: "Packing activity · two workers alongside the conveyor",
  },
};
document.querySelectorAll("[data-scenario]").forEach((button) =>
  button.addEventListener("click", async () => {
    const scenario = scenarios[button.dataset.scenario];
    await setView("model");
    selectArea(scenario.area);
    if (button.dataset.scenario === "busy") model?.reset();
    else model?.focusScenario(scenario.area);
    $("scenario-caption").textContent =
      `SIMULATED · ${scenario.title} · authored routes, not detected events`;
    dispatchReplay({ type: "seek", seconds: scenario.time });
    dispatchReplay({ type: "play" });
  }),
);

// The facility stays mounted underneath this drill-in. Removing the frame on close
// releases its replay and optional Cesium contexts; the original viewer survives.
let analysisReturn;
function openAnalysis(trigger) {
  if ($("analysis-dialog").open) return;
  analysisReturn = {
    trigger, x: window.scrollX, y: window.scrollY,
    panels: [...document.querySelectorAll(".map-panel, .detail-panel, #details")].map(element => ({element, top: element.scrollTop, left: element.scrollLeft})),
    pose: model?.captureView(),
  };
  dispatchReplay({type: "pause"});
  selectAnalysisMode("loading");
  $("analysis-dialog").showModal();
}
$("dispatch-comparison-link").addEventListener("click", event => {
  event.preventDefault(); openAnalysis(event.currentTarget);
});
$("close-analysis").addEventListener("click", () => $("analysis-dialog").close());
window.addEventListener("message", event => {
  if (event.origin === location.origin && event.source === $("analysis-frame").contentWindow && event.data?.type === "seeo-close-analysis") $("analysis-dialog").close();
});
$("analysis-dialog").addEventListener("close", () => {
  $("analysis-frame").src = "about:blank";
  const saved = analysisReturn;
  if (!saved) return;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if ($("analysis-dialog").open) return;
    model?.restoreView(saved.pose);
    for (const panel of saved.panels) { panel.element.scrollTop = panel.top; panel.element.scrollLeft = panel.left; }
    window.scrollTo(saved.x, saved.y);
    if (saved.trigger?.isConnected) saved.trigger.focus({preventScroll: true});
  }));
});

function selectAnalysisMode(mode) {
  const loading = mode === "loading";
  document.querySelector(".analysis-context summary").textContent = loading ? "Dispatch bays · camera context" : "Dispatch crossing · camera context";
  document.querySelector(".analysis-context p").textContent = loading ? "Dispatch bays · C01 shared context · Generated static illustration. The experiment below is a separate stylized loading cutout; observed site measurements are not connected." : "Dispatch crossing · C01 · Generated static illustration. The comparison below is a separate fictional crossing model.";
  $("analysis-context-image").src = loading ? areaImages.dispatch : areaImages.crossing;
  $("analysis-context-image").alt = loading ? "Synthetic dispatch bay camera context" : "Synthetic dispatch crossing camera context";
  if (state.view === "model") { if (loading) model?.dockView(); else model?.closeUp(); }
  $("analysis-title").textContent = loading ? "Trailer loading analysis" : "Dispatch crossing analysis";
  $("analysis-frame").src = loading ? "./loading-comparison.html?embed=1" : "./dispatch-comparison.html?embed=1";
  for (const button of document.querySelectorAll("[data-analysis-mode]")) button.setAttribute("aria-pressed", button.dataset.analysisMode === mode);
}
for (const button of document.querySelectorAll("[data-analysis-mode]")) button.addEventListener("click", () => selectAnalysisMode(button.dataset.analysisMode));
