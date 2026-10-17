import "./loading.css";
import { compareLoading, loadingFrame } from "./loading.js";
import { createLoadingScene } from "./loading-scene.js";
const $ = (id) => document.getElementById(id),
  form = $("settings");
let comparison,
  time = 0,
  playing = false,
  last = 0,
  scenes = [],
  three = false;
const fmt = (n) => (n === null ? "Not completed" : n.toFixed(1));
const duration = (n) =>
  `${Math.floor(Math.round(n) / 60)} min ${Math.round(n) % 60} s`;
function delta(before, after, unit = "") {
  return before === null || after === null
    ? "Censored"
    : `${(before - after).toFixed(1)} ${unit}`;
}
function summary() {
  const b = comparison.baseline.metrics,
    p = comparison.proposal.metrics,
    window = comparison.baseline.config.window,
    order = comparison.baseline.config.order;
  const full = b.completionTime !== null && p.completionTime !== null,
    saved = full ? b.completionTime - p.completionTime : null;
  $("headline").textContent = full
    ? saved === 0
      ? "No change: equal layouts load at the same time"
      : `${duration(Math.abs(saved))} ${saved > 0 ? "faster" : "extra time"} for the same ${order}-pallet order`
    : "Trial window ends before both trailers finish";
  $("summary-window").textContent =
    `${order} equal pallet IDs · 2 forklifts + 1 checker + 1 dock · common ${window} s window · baseline 24 m / 12 m`;
  const cards = [
    ["Trailer fully loaded", b.completionTime, p.completionTime, "s"],
    ["Checker walking", b.walkingMetres, p.walkingMetres, "m"],
    ["Forklift travel", b.forkliftMetres, p.forkliftMetres, "m"],
    ["Checker walking time", b.walkingTime, p.walkingTime, "actor-s"],
    ["Forklift queue wait", b.forkliftWait, p.forkliftWait, "actor-s"],
    ["Delivered in window", b.delivered, p.delivered, "pallets"],
  ];
  $("scorecards").innerHTML = cards
    .map(
      ([title, bv, pv, unit]) =>
        `<article class="scorecard"><h3>${title}</h3><strong>${title === "Trailer fully loaded" && bv !== null ? duration(bv) : fmt(bv)} → ${title === "Trailer fully loaded" && pv !== null ? duration(pv) : fmt(pv)} ${title === "Trailer fully loaded" ? "" : unit}</strong><p class="impact ${title === "Delivered in window" ? "" : bv >= pv ? "saved" : "added"}">${delta(bv, pv, unit)} before − after</p></article>`,
    )
    .join("");
  $("completion-note").textContent = full
    ? `Both complete the same ${order}-pallet order. Trailer time saving: ${((saved / b.completionTime) * 100).toFixed(1)}%, computed from scheduled deliveries. Staging distance determines loaded and empty forklift travel; checker-station distance determines walking and inspection-resource availability. The schedules account for the resulting queues.`
    : `Censored: before ${b.delivered}/${order}, after ${p.delivered}/${order} delivered. No full-order loading time saving is claimed. Distances and waits below are partial-window totals.`;
  const rows = [
    ["Trailer fully loaded", "completionTime", "s"],
    ["All empty returns complete", "returnCompletionTime", "s"],
    ["Pickup dwell completed", "picked", "pallets"],
    ["Delivered to trailer", "delivered", "pallets"],
    ["Remaining to deliver", "remaining", "pallets"],
    ["Checker walking distance", "walkingMetres", "m"],
    ["Checker walking time", "walkingTime", "actor-s"],
    ["Forklift travel distance", "forkliftMetres", "m"],
    ["Forklift travel time", "forkliftTravel", "actor-s"],
    ["Forklift queue wait", "forkliftWait", "actor-s"],
    ["Dock queue wait (subset)", "dockQueue", "actor-s"],
    ["Dock unused capacity in fixed window", "dockIdle", "s"],
  ];
  $("metrics").innerHTML = rows
    .map(
      ([label, key, unit]) =>
        `<tr><td>${label}</td><td>${fmt(b[key])} ${unit}</td><td>${fmt(p[key])} ${unit}</td><td>${delta(b[key], p[key], unit)}</td></tr>`,
    )
    .join("");
  $("table-window").textContent = `All metrics clipped to the same ${window} s`;
  $("proposal-label").textContent =
    `Staging ${comparison.proposal.config.layout.staging} m · checker ${comparison.proposal.config.layout.checker} m`;
  $("events").innerHTML = comparison.baseline.jobs
    .map(
      (j, i) =>
        `<button type="button" data-time="${j.deliveredAt}"><strong>${j.id}</strong> · before loaded ${j.deliveredAt.toFixed(1)} s / after ${comparison.proposal.jobs[i].deliveredAt.toFixed(1)} s${j.deliveredAt > window ? " · beyond window" : ""}</button>`,
    )
    .join("");
}
function plan(run, frame) {
  const { staging, checker } = run.config.layout,
    c = frame.counts;
  const stock = run.jobs
    .map((j, i) =>
      i >= c.picked
        ? `<rect x="${-staging - 2 - (i % 6) * 0.8}" y="${3 + Math.floor(i / 6) * 0.8}" width=".65" height=".65" fill="#ae9770"/>`
        : "",
    )
    .join("");
  const loaded = run.jobs
    .map((j, i) =>
      i < c.delivered
        ? `<rect x="${7 + (i % 6) * 1.2}" y="${-1 + Math.floor((i % 24) / 6) * 0.5}" width="1" height=".4" fill="#ae9770"/>`
        : "",
    )
    .join("");
  return `<rect x="-54" y="-28" width="76" height="42" fill="#e4ece5"/><path d="M ${-staging} 0 H 6 M 0 0 V ${-checker}" fill="none" stroke="#acbca3" stroke-width="1.2"/><path d="M ${-staging} -3 H 0" stroke="#9aaea0" stroke-width=".12"/><text x="${-staging / 2}" y="-4" font-size="1.7" text-anchor="middle">${staging} m loaded route</text><text x="1" y="${-checker / 2 - 2}" font-size="1.5">${checker} m walk</text><rect x="6.5" y="-2" width="9" height="4" rx=".4" fill="#c1d1cd" stroke="#627c7d" stroke-width=".2"/><rect x="16" y="-1.8" width="3" height="3.6" rx=".5" fill="#345c65"/>${loaded}<text x="12" y="5" font-size="1.7" text-anchor="middle">TRAILER · ${c.delivered}/${run.config.order}</text><circle cx="0" cy="0" r="1.5" fill="#d6e5d3"/><text x="0" y="8" font-size="1.6" text-anchor="middle">CHECK → DOCK 6 m</text><text x="${-staging}" y="10" font-size="1.7" text-anchor="middle">STAGING · ${c.notPicked} left</text>${stock}<rect x="-1" y="${-checker - 1}" width="2" height="2" fill="#b3c88b"/><text x="-2" y="${-checker - 2}" font-size="1.5" text-anchor="end">Checker station</text>${frame.forklifts.map((a, i) => `<g transform="translate(${a.x},${a.y + (i === 0 ? -0.8 : 0.8)})"><g transform="rotate(${(a.heading * 180) / Math.PI})"><rect x="-1.3" y="-.65" width="2.3" height="1.3" rx=".2" fill="#dfa147" stroke="#526968" stroke-width=".12"/><rect x="-.8" y="-.5" width=".8" height="1" fill="#345c65"/><path d="M .8 -.6 V .6 M .8 -.4 H 2 M .8 .4 H 2" fill="none" stroke="#3a5557" stroke-width=".16"/>${a.carrying ? '<rect x="1" y="-.5" width="1" height="1" fill="#ae9770" stroke="#7b6746" stroke-width=".1"/>' : ""}</g><text y="${i === 0 ? -2 : 3}" font-size="1.4" text-anchor="middle">${a.id} ${a.stage}</text></g>`).join("")}<circle cx="${frame.checker.x}" cy="${frame.checker.y}" r=".5" fill="#a4bc47" stroke="#476342" stroke-width=".15"/><text x="-52" y="-24" font-size="1.6">METRES · same scale both sides · stock + carrying + loaded = ${run.config.order}</text>`;
}
function render() {
  ["baseline", "proposal"].forEach((side, i) => {
    const run = comparison[side],
      f = loadingFrame(run, time),
      c = f.counts;
    $(`${side}-view`).querySelector("svg").innerHTML = plan(run, f);
    scenes[i]?.update(f);
    $(`${side}-counts`).textContent =
      `${c.picked} picked · ${c.delivered} loaded · ${c.carrying} carrying · ${c.notPicked} staging · ${c.remaining} remaining to deliver`;
    $(`${side}-actors`).textContent =
      f.forklifts
        .map(
          (a) =>
            `${a.id}: ${a.stage}${a.pallet ? " " + a.pallet : ""}${a.carrying ? " [loaded]" : " [empty]"}`,
        )
        .join(" · ") + ` · Checker: ${f.checker.stage}`;
  });
  $("seek").value = time;
  $("time").textContent =
    `${time.toFixed(1)} / ${comparison.baseline.config.window} s`;
  $("play").textContent = playing ? "Pause" : "Play";
}
function destroyScenes() {
  scenes.forEach((s) => s.destroy());
  scenes = [];
}
function show3D(enabled) {
  destroyScenes();
  three = false;
  if (enabled)
    for (const side of ["baseline", "proposal"])
      $(`${side}-view`).querySelector(".cesium").hidden = false;
  if (enabled)
    try {
      ["baseline", "proposal"].forEach((side) =>
        scenes.push(
          createLoadingScene(
            $(`${side}-view`).querySelector(".cesium"),
            comparison[side],
            {
              staging: Math.max(
                comparison.baseline.config.layout.staging,
                comparison.proposal.config.layout.staging,
              ),
              checker: Math.max(
                comparison.baseline.config.layout.checker,
                comparison.proposal.config.layout.checker,
              ),
            },
          ),
        ),
      );
      three = true;
    } catch {
      destroyScenes();
      $("render-status").textContent =
        "3D is unavailable in this browser. Plan remains available with the same task frames.";
    }
  for (const side of ["baseline", "proposal"]) {
    const view = $(`${side}-view`);
    view.querySelector("svg").hidden = three;
    view.querySelector(".cesium").hidden = !three;
  }
  $("overview").disabled = !three;
  $("plan").classList.toggle("selected", !three);
  $("three").classList.toggle("selected", three);
  $("plan").setAttribute("aria-pressed", !three);
  $("three").setAttribute("aria-pressed", three);
  if (three) requestAnimationFrame(() => scenes.forEach((s) => s.resize()));
  render();
}
function rerun() {
  const data = new FormData(form);
  try {
    comparison = compareLoading({
      order: +data.get("order"),
      window: +data.get("window"),
      proposal: {
        staging: +data.get("staging"),
        checker: +data.get("checker"),
      },
    });
    time = 0;
    playing = false;
    $("seek").max = comparison.baseline.config.window;
    summary();
    $("run-status").textContent =
      "Comparison rerun. Same order and service times on both sides; only the proposed geometry changed.";
    show3D(three);
  } catch (error) {
    $("run-status").textContent = error.message;
  }
}
form.addEventListener("submit", (e) => {
  e.preventDefault();
  rerun();
});
form.addEventListener(
  "input",
  () =>
    ($("run-status").textContent =
      "Settings changed. Rerun to apply them to both trial schedules."),
);
$("equal").onclick = () => {
  form.elements.staging.value = 24;
  form.elements.checker.value = 12;
  rerun();
};
$("play").onclick = () => {
  if (time >= comparison.baseline.config.window) time = 0;
  playing = !playing;
  last = performance.now();
  render();
};
$("reset").onclick = () => {
  time = 0;
  playing = false;
  render();
};
$("seek").oninput = () => {
  playing = false;
  time = +$("seek").value;
  render();
};
$("events").onclick = (e) => {
  const button = e.target.closest("[data-time]");
  if (button) {
    time = Math.min(+button.dataset.time, comparison.baseline.config.window);
    playing = false;
    render();
  }
};
$("plan").onclick = () => show3D(false);
$("three").onclick = () => show3D(true);
$("overview").onclick = () => scenes.forEach((s) => s.camera());
window.addEventListener("resize", () => scenes.forEach((s) => s.resize()));
window.addEventListener("pagehide", destroyScenes);
const embedded = new URLSearchParams(location.search).has("embed");
if (embedded) {
  document.body.classList.add("embedded");
  document.querySelector(".mode-links").hidden = true;
  const close = () =>
    window.parent.postMessage({ type: "seeo-close-analysis" }, location.origin);
  $("back").onclick = (e) => {
    e.preventDefault();
    close();
  };
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  });
}
rerun();
function tick(now) {
  if (playing) {
    time = Math.min(
      comparison.baseline.config.window,
      time + Math.min((now - last) / 1000, 0.25) * +$("rate").value,
    );
    if (time >= comparison.baseline.config.window) playing = false;
    render();
  }
  last = now;
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
