import "./dispatch.css";
import {
  createWorkload,
  compareDispatch,
  getDispatchFrame,
} from "./dispatch.js";
const $ = (id) => document.getElementById(id);
if (new URLSearchParams(location.search).get("from") === "local")
  $("back").href = "./seeo-demo.html";
let comparison,
  time = 0,
  playing = false,
  previous,
  highlights = [],
  renderers = {},
  mode = "plan";
const names = ["baseline", "proposal"];
const number = (x) =>
  x.toLocaleString(undefined, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  });
function plan(run, frame) {
  const c = run.crossing;
  const barrier = run.config.barrier
    ? [-4, 4]
        .map(
          (y) =>
            `<path d="M-23 ${y}H7 M9 ${y}H23" stroke="#49695b" stroke-width=".22"/>`,
        )
        .join("")
    : "";
  const gate = run.config.gate
    ? `<text x="${c + 2}" y="-5" font-size=".65" fill="#6c6e43">${frame.gatePhase === "person" ? "PEOPLE PHASE" : frame.gatePhase === "vehicle" ? "VEHICLE PHASE" : "GATE IDLE"}</text><path d="M${c - 1} -3.8H${c + 1} M${c - 1} 3.8H${c + 1}" stroke="${frame.gatePhase === "person" ? "#7f9e41" : "#d9923b"}" opacity="${frame.gatePhase === "person" ? 0.25 : 1}" stroke-width=".25" stroke-dasharray=".4 .2"/>`
    : "";
  const path = run.config.barrier ? "M0 -8H8V8H0" : "M0 -8V8";
  return `<rect x="-27" y="-11" width="54" height="22" fill="#e8eeea"/><path d="M-26 -3.4H26V3.4H-26Z" fill="#d0dbd7"/><path d="M-25 0H25" stroke="#fff" stroke-width=".1" stroke-dasharray="1 1"/><path d="${path}" fill="none" stroke="#96ac75" stroke-width=".18" stroke-dasharray=".4 .3"/><rect x="${c - 1.5}" y="-3.5" width="3" height="7" fill="#e8b064" opacity=".22"/><path d="M${c - 3} -3.4V3.4 M${c + 3} -3.4V3.4" stroke="#eef3ef" stroke-width=".12"/>${barrier}${gate}<text x="-24" y="-9" font-size=".65" fill="#5f7e7a">DISPATCH · metres</text><path d="M-24 9H-19" stroke="#58736c" stroke-width=".1"/><text x="-23" y="10.2" font-size=".6" fill="#58736c">5 m</text>${frame.actors
    .filter((a) => a.status === "active")
    .map((a) => {
      const selected = highlights.includes(a.id),
        fill = selected
          ? "#d75753"
          : a.kind === "person"
            ? "#b5cf49"
            : "#dba24d";
      return `<g transform="translate(${a.x} ${a.y})"><circle r="${a.kind === "person" ? 0.35 : 1.5}" fill="none" stroke="${selected ? "#bd3030" : "#52736a"}" stroke-width=".05" stroke-dasharray=".12 .09"/>${selected ? '<circle r="2" fill="none" stroke="#cb4641" stroke-width=".12"/>' : ""}${a.kind === "person" ? `<circle r=".3" fill="${fill}" stroke="#52612e" stroke-width=".05"/>` : `<g transform="rotate(${(a.heading * 180) / Math.PI})"><rect x="-1.25" y="-.7" width="2.5" height="1.4" rx=".16" fill="${fill}" stroke="#7a5c2d" stroke-width=".07"/><rect x="-.25" y="-.5" width=".9" height="1" fill="#42646b"/><path d="M1.2 -.5H1.6 M1.2 .5H1.6" stroke="#47606a" stroke-width=".12"/></g>`}<text y="-1.8" text-anchor="middle" font-size=".6" fill="#24474f">${a.id}</text></g>`;
    })
    .join("")}`;
}
function draw() {
  $("seek").value = time;
  $("time").textContent = `${time.toFixed(1)} / 120 s`;
  for (const side of names) {
    const run = comparison[side],
      frame = getDispatchFrame(run, time);
    $(`${side}-view`).querySelector("svg").innerHTML = plan(run, frame);
    renderers[side]?.update(frame, highlights);
    const counts = ["active", "queued", "complete", "pending"].map(
      (status) => frame.actors.filter((a) => a.status === status).length,
    );
    $(`${side}-live`).textContent =
      `${counts[0]} moving / waiting in scene · ${counts[1]} arrival-queued · ${counts[2]} completed · ${counts[3]} future arrivals`;
    $(`${side}-view`).dataset.time = frame.time;
  }
  $("play").textContent = playing ? "Pause" : "Play";
}
function results() {
  const rows = [
    [
      "encounters",
      "Proximity episodes",
      "Unique pair episodes; centre-distance threshold",
      "",
    ],
    [
      "exposureSeconds",
      "Proximity exposure",
      "Sum of pair-seconds below threshold",
      "pair-s",
    ],
    [
      "coOccupancySeconds",
      "Conflict-area co-occupancy",
      "Wall-clock seconds with both kinds in buffered zone",
      "s",
    ],
    [
      "personWaiting",
      "People waiting",
      "Total actor-seconds; includes arrival queues",
      "s",
    ],
    [
      "vehicleWaiting",
      "Forklifts waiting",
      "Total actor-seconds; includes arrival queues",
      "s",
    ],
    [
      "completed",
      "Jobs completed",
      "People and forklifts reaching original destinations",
      "jobs",
    ],
    [
      "backlog",
      "Jobs unfinished",
      "Active + queued + future arrivals at trial end",
      "jobs",
    ],
    [
      "distance",
      "Journey distance",
      "Total travelled, including unfinished jobs",
      "m",
    ],
  ];
  $("metrics").innerHTML = rows
    .map(([key, label, description, unit]) => {
      const a = comparison.baseline.metrics[key],
        b = comparison.proposal.metrics[key],
        format = (x) =>
          ["encounters", "completed", "backlog"].includes(key) ? x : number(x);
      return `<tr><td>${label}<small>${description}</small></td><td>${format(a)} ${unit}</td><td>${format(b)} ${unit}</td><td>${b > a ? "+" : ""}${format(b - a)} ${unit}</td></tr>`;
    })
    .join("");
  const events = names
    .flatMap((side) =>
      comparison[side].metrics.events.map((e) => ({ ...e, side })),
    )
    .sort((a, b) => a.start - b.start);
  $("encounters").replaceChildren();
  if (!events.length)
    $("encounters").textContent =
      "No pairs fell below this threshold during the trial.";
  for (const event of events) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "encounter";
    button.innerHTML = `<strong>${event.side === "baseline" ? "Before" : "After"} · ${event.start.toFixed(1)} s · ${event.ids.join(" + ")}</strong><span>${event.duration.toFixed(1)} pair-s ↗</span>`;
    button.addEventListener("click", () => {
      playing = false;
      time = event.start;
      highlights = event.ids;
      draw();
      $("seek").focus({ preventScroll: true });
    });
    $("encounters").append(button);
  }
}
function run() {
  const f = new FormData($("settings")),
    proposal = {
      barrier: f.has("barrier"),
      gate: f.has("gate"),
      speed: +f.get("speed"),
      yielding: +f.get("yielding"),
      compliance: +f.get("compliance"),
    };
  comparison = compareDispatch({
    workload: createWorkload({ seed: +f.get("seed"), demand: f.get("demand") }),
    threshold: +f.get("threshold"),
    proposal,
  });
  playing = false;
  time = 0;
  highlights = [];
  $("run-status").textContent =
    `Trial applied · seed ${f.get("seed")} · ${comparison.baseline.jobs.length} identical jobs per side · centre threshold ${f.get("threshold")} m · 120 s / 0.1 s steps · proposal ${proposal.speed} m/s, ${proposal.yielding * 100}% ungated yield, ${proposal.compliance * 100}% gate compliance.`;
  $("proposal-label").textContent =
    `${proposal.barrier ? "Channel barrier" : "Direct route"} · ${proposal.gate ? "gate on" : "gate off"}`;
  for (const side of names) renderers[side]?.configure(comparison[side]);
  results();
  draw();
}
$("settings").addEventListener("submit", (e) => {
  e.preventDefault();
  run();
});
$("settings").addEventListener("input", () => {
  $("run-status").textContent =
    "Settings edited. Run comparison to apply them; views and results still show the previous trial.";
});
$("play").addEventListener("click", () => {
  if (time >= 120) time = 0;
  playing = !playing;
  previous = undefined;
  highlights = [];
  draw();
});
$("reset").addEventListener("click", () => {
  playing = false;
  time = 0;
  highlights = [];
  draw();
});
$("seek").addEventListener("input", (e) => {
  playing = false;
  time = +e.target.value;
  highlights = [];
  draw();
});
function animate(now) {
  if (playing && previous !== undefined) {
    time = Math.min(
      120,
      time + Math.min(0.1, (now - previous) / 1000) * +$("rate").value,
    );
    if (time >= 120) playing = false;
    draw();
  }
  previous = now;
  requestAnimationFrame(animate);
}
function setMode(value) {
  mode = value;
  $("overview").disabled = mode !== "3d";
  $("crossing-camera").disabled = mode !== "3d";
  for (const side of names) {
    $(`${side}-view`)
      .querySelector("svg")
      .toggleAttribute("hidden", mode === "3d");
    $(`${side}-view`).querySelector(".cesium").hidden = mode !== "3d";
    renderers[side]?.resize();
  }
  for (const [id, active] of [
    ["plan", mode === "plan"],
    ["three", mode === "3d"],
  ]) {
    $(id).classList.toggle("selected", active);
    $(id).setAttribute("aria-pressed", String(active));
  }
  draw();
}
$("plan").addEventListener("click", () => setMode("plan"));
let loading = false;
$("three").addEventListener("click", async () => {
  if (loading) return;
  loading = true;
  $("three").disabled = true;
  try {
    if (!renderers.baseline) {
      $("render-status").textContent = "Preparing paired 3D dispatch scenes…";
      const { createDispatchScene } = await import("./dispatch-scene.js");
      // Containers must be visible when Cesium reads their dimensions.
      setMode("3d");
      for (const side of names)
        renderers[side] = createDispatchScene(
          $(`${side}-view`).querySelector(".cesium"),
          comparison[side],
        );
    }
    setMode("3d");
    $("render-status").textContent =
      "Rendered model trajectories · drag to orbit, scroll to zoom. Overview and crossing angle apply to both scenes. Plan remains available.";
  } catch (error) {
    console.error(error);
    for (const renderer of Object.values(renderers)) renderer.destroy();
    renderers = {};
    setMode("plan");
    $("render-status").textContent =
      "3D is unavailable on this browser. The plan view shows the same calculated trajectories and metrics.";
  } finally {
    loading = false;
    $("three").disabled = false;
  }
});
for (const [id, angle] of [
  ["overview", "overview"],
  ["crossing-camera", "crossing"],
])
  $(id).addEventListener("click", () => {
    for (const renderer of Object.values(renderers)) renderer.camera(angle);
  });
window.addEventListener("resize", () => {
  for (const renderer of Object.values(renderers)) renderer.resize();
});
run();
requestAnimationFrame(animate);
