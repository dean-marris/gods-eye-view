import {
  buildProductivity,
  productivityAt,
  PRODUCTIVITY_METRICS,
} from "./productivity.js";
const number = (value, metric) =>
  metric === "delivered" ? String(value) : value.toFixed(1);
export function createProductivityView(container, onSeek) {
  let model,
    metric = "delivered",
    time = 0,
    width = 800,
    plot;
  container.innerHTML = `
    <div class="productivity-heading"><div><p class="eyebrow">PRODUCTIVITY LENS / SIMULATED LAYOUT</p><h2>See the change.<br><span>Measure the impact.</span></h2></div><div class="productivity-outcome"><strong id="productivity-impact"></strong><span id="productivity-impact-note"></span></div></div>
    <div class="productivity-metrics" role="group" aria-label="Productivity metric">${Object.entries(
      PRODUCTIVITY_METRICS,
    )
      .map(
        ([key, m]) =>
          `<button type="button" data-metric="${key}" aria-pressed="${key === metric}">${m.label}<span>${m.unit}</span></button>`,
      )
      .join("")}</div>
    <div class="chart-topline"><p id="productivity-axis"></p><div class="chart-legend" aria-label="Chart series"><span class="legend-before">Before</span><span class="legend-proposed">Proposed</span></div></div>
    <div class="productivity-chart"><svg aria-hidden="true"></svg></div>
    <p id="productivity-chart-summary" class="sr-only"></p>
    <div class="productivity-readouts" aria-label="Values at shared time"><div class="before"><span>BEFORE · <b class="cursor-time"></b></span><strong id="productivity-before"></strong></div><div class="proposed"><span>PROPOSED · <b class="cursor-time"></b></span><strong id="productivity-proposal"></strong></div><div class="benefit"><span id="productivity-benefit-label"></span><strong id="productivity-benefit"></strong></div></div>
    <div class="chart-foot"><p>Click the chart to seek both layouts. Use Shared time below for keyboard control.</p><button id="productivity-completion" type="button">Jump to proposed completion ↗</button></div>
    <div class="implementation"><div class="implementation-heading"><p class="eyebrow">EXPLORE THE PROPOSED CHANGES</p><span>Layout → mechanism → modeled outcome</span></div><div class="implementation-path">
      <div class="implementation-inputs"><button type="button" data-node="staging" data-metric="forkliftMetres"><span>01 / STAGING → CHECK</span><strong id="productivity-staging"></strong><small>Loaded + empty routes ↗</small></button><button type="button" data-node="checker" data-metric="walkingMetres"><span>02 / CHECKER → CHECK</span><strong id="productivity-checker"></strong><small>Out-and-back walking ↗</small></button></div>
      <span class="implementation-arrow" aria-hidden="true">→</span><button type="button" data-node="queue" data-metric="forkliftWait"><span>RESOURCE FLOW</span><strong>Travel + queues</strong><small>Inspect the waiting curve ↗</small></button><span class="implementation-arrow" aria-hidden="true">→</span><button type="button" data-node="outcome" data-metric="delivered"><span>SAME PALLET ORDER</span><strong id="productivity-order"></strong><small>Inspect loading progress ↗</small></button>
    </div><p id="productivity-detail"></p><p class="productivity-caveat">Proposed simulated changes, not installed works or observed gains. Actor-seconds sum forklift waiting; they are not elapsed trailer time savings. Individual changes have no attributed percentage saving.</p></div>`;
  const $ = (id) => container.querySelector(`#${id}`),
    svg = container.querySelector("svg");
  function detail(node = "outcome") {
    const layout = model.comparison.proposal.config.layout;
    $("productivity-detail").textContent = {
      staging: `Staging changes from 24 m to ${layout.staging} m from inspection. The schedule recalculates loaded travel and empty returns, affecting when forklifts can collect the next pallet.`,
      checker: `The checker station changes from 12 m to ${layout.checker} m from inspection. Each pallet requires an out-and-back walk; checker availability also affects forklift queues.`,
      queue:
        "Forklift waiting includes inspection queues and dock queues. Both resources serve one pallet at a time. Shorter routes can shift queues elsewhere; inspect both curves at the same elapsed time.",
      outcome:
        model.fullOrderSaving === null
          ? "At least one layout is unfinished in this common window. Loading progress and backlog remain visible; no full-order saving is claimed."
          : `Both schedules complete the same ${model.comparison.baseline.config.order}-pallet order. The full-order completion difference is ${model.fullOrderSaving.toFixed(1)} seconds (before minus proposed). Explore the curves to see when the gain appears.`,
    }[node];
  }
  function draw() {
    if (!model) return;
    const m = PRODUCTIVITY_METRICS[metric],
      series = model.series[metric],
      height = 300;
    plot = { left: 48, right: width - 20, top: 18, bottom: 258 };
    const x = (t) => plot.left + (t / model.window) * (plot.right - plot.left),
      y = (v) => plot.bottom - (v / series.max) * (plot.bottom - plot.top);
    const path = (points) =>
      points
        .map(
          (p, i) =>
            `${i ? "L" : "M"}${x(p.time).toFixed(2)},${y(p.value).toFixed(2)}`,
        )
        .join(" ");
    const ticks = width < 480 ? 3 : 5;
    const grid = Array.from({ length: 5 }, (_, i) => {
      const value = (series.max * i) / 4,
        yy = y(value);
      return `<path d="M${plot.left} ${yy}H${plot.right}" class="chart-grid"/><text x="${plot.left - 10}" y="${yy + 4}" text-anchor="end">${metric === "delivered" && value % 1 !== 0 ? "" : Math.round(value * 10) / 10}</text>`;
    }).join("");
    const axis = Array.from({ length: ticks }, (_, i) => {
      const t = (model.window * i) / (ticks - 1);
      return `<text x="${x(t)}" y="282" text-anchor="middle">${Math.round(t * 10) / 10} s</text>`;
    }).join("");
    const completion =
      model.completion === null
        ? ""
        : `<path class="completion-line" d="M${x(model.completion)} ${plot.top}V${plot.bottom}"/>`;
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.innerHTML = `<defs><linearGradient id="productivity-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#d6ed70" stop-opacity=".18"/><stop offset="1" stop-color="#d6ed70" stop-opacity=".015"/></linearGradient></defs>${grid}${axis}${completion}<path d="${path(series.proposal)} L${x(model.window)},${plot.bottom} L${plot.left},${plot.bottom}Z" fill="url(#productivity-fill)"/><path class="chart-before" d="${path(series.baseline)}"/><path class="chart-proposed" d="${path(series.proposal)}"/><g class="chart-cursor"><path class="cursor-line"/><path class="cursor-gap"/><circle class="cursor-before" r="5"/><circle class="cursor-proposed" r="5"/><rect class="cursor-badge" y="0" width="60" height="20" rx="4"/><text class="cursor-label" y="14" text-anchor="middle"></text></g>`;
    $("productivity-axis").textContent =
      `${m.label} (${m.unit}) · ${m.higher ? "higher" : "lower"} is better`;
    const end = productivityAt(model, metric, model.window);
    $("productivity-chart-summary").textContent =
      `Cumulative ${m.label.toLowerCase()} over the common ${model.window}-second window. Amber dashed is before, lime solid is proposed. At the window end: before ${number(end.baseline, metric)} ${m.unit}, proposed ${number(end.proposal, metric)} ${m.unit}. ${m.higher ? "Higher" : "Lower"} is better. Pallet loads step only when delivery completes. Readouts below show shared replay time.`;
    update(time);
  }
  function update(nextTime) {
    time = nextTime;
    if (!model || !plot) return;
    const at = productivityAt(model, metric, time),
      m = PRODUCTIVITY_METRICS[metric],
      max = model.series[metric].max;
    const x = plot.left + (at.time / model.window) * (plot.right - plot.left),
      y = (v) => plot.bottom - (v / max) * (plot.bottom - plot.top);
    svg
      .querySelector(".cursor-line")
      .setAttribute("d", `M${x} ${plot.top}V${plot.bottom}`);
    svg
      .querySelector(".cursor-gap")
      .setAttribute("d", `M${x} ${y(at.baseline)}V${y(at.proposal)}`);
    for (const side of ["baseline", "proposal"]) {
      const circle = svg.querySelector(
        side === "baseline" ? ".cursor-before" : ".cursor-proposed",
      );
      circle.setAttribute("cx", x);
      circle.setAttribute("cy", y(at[side]));
    }
    const badgeX = Math.max(30, Math.min(width - 30, x));
    svg.querySelector(".cursor-badge").setAttribute("x", badgeX - 30);
    svg.querySelector(".cursor-label").setAttribute("x", badgeX);
    svg.querySelector(".cursor-label").textContent = `${at.time.toFixed(1)} s`;
    $("productivity-before").textContent =
      `${number(at.baseline, metric)} ${m.unit}`;
    $("productivity-proposal").textContent =
      `${number(at.proposal, metric)} ${m.unit}`;
    $("productivity-benefit").textContent =
      `${at.benefit > 0 ? "+" : ""}${number(at.benefit, metric)} ${m.unit}`;
    $("productivity-benefit").classList.toggle("negative", at.benefit < 0);
    $("productivity-benefit-label").textContent =
      `${at.benefit === 0 ? "NO DIFFERENCE" : at.benefit > 0 ? "PROPOSED BENEFIT" : "PROPOSED PENALTY"} · ${m.higher ? "PROPOSED − BEFORE" : "BEFORE − PROPOSED"}`;
    container
      .querySelectorAll(".cursor-time")
      .forEach((el) => (el.textContent = `${at.time.toFixed(1)} s`));
  }
  container.addEventListener("click", (event) => {
    const button = event.target.closest("[data-metric]");
    if (!button) return;
    metric = button.dataset.metric;
    container
      .querySelectorAll("[data-metric]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", b.dataset.metric === metric),
      );
    detail(
      button.dataset.node ||
        {
          delivered: "outcome",
          walkingMetres: "checker",
          forkliftMetres: "staging",
          forkliftWait: "queue",
        }[metric],
    );
    draw();
  });
  svg.addEventListener("pointerdown", (event) => {
    const rect = svg.getBoundingClientRect(),
      local = ((event.clientX - rect.left) / rect.width) * width;
    onSeek(
      Math.max(
        0,
        Math.min(
          model.window,
          ((local - plot.left) / (plot.right - plot.left)) * model.window,
        ),
      ),
    );
  });
  $("productivity-completion").onclick = () => {
    if (model.completion !== null) onSeek(model.completion);
  };
  const observer = new ResizeObserver((entries) => {
    width = Math.max(280, entries[0].contentRect.width);
    draw();
  });
  observer.observe(container.querySelector(".productivity-chart"));
  return {
    setComparison(comparison) {
      model = buildProductivity(comparison);
      time = 0;
      const layout = comparison.proposal.config.layout,
        order = comparison.baseline.config.order;
      $("productivity-impact").textContent =
        model.fullOrderSaving === null
          ? "Unfinished trial"
          : model.fullOrderSaving === 0
            ? "Equal finish"
            : `${Math.floor(Math.round(Math.abs(model.fullOrderSaving)) / 60)} min ${Math.round(Math.abs(model.fullOrderSaving)) % 60} s`;
      $("productivity-impact-note").textContent =
        model.fullOrderSaving === null
          ? "No full-order saving claimed"
          : model.fullOrderSaving === 0
            ? "Same order · same completion time"
            : `${((Math.abs(model.fullOrderSaving) / comparison.baseline.metrics.completionTime) * 100).toFixed(1)}% ${model.fullOrderSaving > 0 ? "faster" : "slower"} · same ${order}-pallet order`;
      $("productivity-staging").textContent = `24 → ${layout.staging} m`;
      $("productivity-checker").textContent = `12 → ${layout.checker} m`;
      $("productivity-order").textContent = `${order} pallets`;
      $("productivity-completion").disabled = model.completion === null;
      $("productivity-completion").textContent =
        model.completion === null
          ? "Proposed completion beyond window"
          : `Jump to proposed finish · ${model.completion.toFixed(1)} s ↗`;
      container
        .querySelectorAll("[data-metric]")
        .forEach((button) =>
          button.setAttribute("aria-pressed", button.dataset.metric === metric),
        );
      detail(
        {
          delivered: "outcome",
          walkingMetres: "checker",
          forkliftMetres: "staging",
          forkliftWait: "queue",
        }[metric],
      );
      draw();
    },
    update,
    destroy: () => observer.disconnect(),
  };
}
