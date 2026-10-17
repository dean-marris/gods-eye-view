// Public model seam: inputs -> deterministic task/resource schedule -> clipped metrics/frame.
// All pallets are available at t=0. Routes use actual metres in the local cutout.
export const BASELINE_LAYOUT = Object.freeze({ staging: 24, checker: 12 });
export const PROPOSED_LAYOUT = Object.freeze({ staging: 12, checker: 4 });
const bounded = (value, fallback, min, max) => {
  const n = value === undefined ? fallback : Number(value);
  if (!Number.isFinite(n) || n < min || n > max)
    throw new RangeError(`Expected finite value ${min}–${max}`);
  return n;
};
const elapsed = (task, time) =>
  Math.max(0, Math.min(task.end, time) - task.start);
export function runLoading(input = {}) {
  const config = {
    order: bounded(input.order, 24, 1, 48),
    window: bounded(input.window, 600, 1, 1800),
    layout: {
      staging: bounded(input.layout?.staging, 24, 2, 48),
      checker: bounded(input.layout?.checker, 12, 0, 24),
    },
    forkliftSpeed: bounded(input.forkliftSpeed, 3, 0.5, 5),
    walkingSpeed: bounded(input.walkingSpeed, 1.5, 0.5, 3),
    pickup: bounded(input.pickup, 4, 0.1, 30),
    inspection: bounded(input.inspection, 3, 0.1, 30),
    loading: bounded(input.loading, 5, 0.1, 30),
  };
  if (!Number.isInteger(config.order))
    throw new RangeError("Order must be a whole number");
  const { layout, forkliftSpeed: fs, walkingSpeed: ws } = config;
  const staging = [-layout.staging, 0],
    check = [0, 0],
    dock = [6, 0],
    station = [0, -layout.checker];
  const forks = [0, 0],
    tasks = [],
    jobs = [],
    bookings = [];
  let checkerFree = 0,
    dockFree = 0;
  function add(actor, pallet, stage, start, end, from, to = from) {
    const distance = Math.hypot(to[0] - from[0], to[1] - from[1]);
    tasks.push({ actor, pallet, stage, start, end, from, to, distance });
  }
  for (let i = 0; i < config.order; i++) {
    const f = forks[0] <= forks[1] ? 0 : 1,
      actor = `F${f + 1}`,
      id = `P${String(i + 1).padStart(2, "0")}`;
    const start = forks[f],
      pickedAt = start + config.pickup,
      arrival = pickedAt + layout.staging / fs;
    const walkStart = Math.max(arrival, checkerFree),
      inspectStart = walkStart + layout.checker / ws;
    const checked = inspectStart + config.inspection,
      checkerEnd = checked + layout.checker / ws;
    const dockArrival = checked + 6 / fs,
      loadStart = Math.max(dockArrival, dockFree),
      deliveredAt = loadStart + config.loading;
    const availableAt = deliveredAt + (layout.staging + 6) / fs;
    add(actor, id, "pickup", start, pickedAt, staging);
    add(actor, id, "loaded travel", pickedAt, arrival, staging, check);
    add(actor, id, "inspection queue", arrival, inspectStart, check);
    add(actor, id, "inspection", inspectStart, checked, check);
    add(actor, id, "to dock", checked, dockArrival, check, dock);
    add(actor, id, "dock queue", dockArrival, loadStart, dock);
    add(actor, id, "loading", loadStart, deliveredAt, dock);
    add(actor, id, "empty return", deliveredAt, availableAt, dock, staging);
    add(
      "checker",
      id,
      "walk to inspection",
      walkStart,
      inspectStart,
      station,
      check,
    );
    add("checker", id, "inspection", inspectStart, checked, check);
    add("checker", id, "walk to station", checked, checkerEnd, check, station);
    bookings.push(
      { resource: actor, pallet: id, start, end: availableAt },
      { resource: "checker", pallet: id, start: walkStart, end: checkerEnd },
      { resource: "dock", pallet: id, start: loadStart, end: deliveredAt },
    );
    jobs.push({
      id,
      forklift: actor,
      start,
      pickedAt,
      deliveredAt,
      availableAt,
    });
    forks[f] = availableAt;
    checkerFree = checkerEnd;
    dockFree = deliveredAt;
  }
  const run = {
    config,
    jobs,
    tasks,
    bookings,
    points: { staging, check, dock, station },
  };
  run.metrics = loadingMetrics(run, config.window);
  return run;
}
export function loadingMetrics(run, time = run.config.window) {
  const t = Math.max(
    0,
    Math.min(Number.isFinite(time) ? time : 0, run.config.window),
  );
  const picked = run.jobs.filter((j) => j.pickedAt <= t).length,
    delivered = run.jobs.filter((j) => j.deliveredAt <= t).length;
  const sum = (predicate, fn) =>
    run.tasks.filter(predicate).reduce((n, s) => n + fn(s), 0);
  return {
    picked,
    delivered,
    remaining: run.config.order - delivered,
    carrying: picked - delivered,
    notPicked: run.config.order - picked,
    returnCompletionTime: run.jobs.every((j) => j.availableAt <= t)
      ? Math.max(...run.jobs.map((j) => j.availableAt))
      : null,
    completionTime:
      delivered === run.config.order
        ? Math.max(...run.jobs.map((j) => j.deliveredAt))
        : null,
    forkliftMetres: sum(
      (s) => s.actor !== "checker",
      (s) =>
        s.end > s.start ? (s.distance * elapsed(s, t)) / (s.end - s.start) : 0,
    ),
    walkingMetres: sum(
      (s) => s.actor === "checker",
      (s) =>
        s.end > s.start ? (s.distance * elapsed(s, t)) / (s.end - s.start) : 0,
    ),
    walkingTime: sum(
      (s) => s.actor === "checker" && s.distance > 0,
      (s) => elapsed(s, t),
    ),
    forkliftTravel: sum(
      (s) => s.actor !== "checker" && s.distance > 0,
      (s) => elapsed(s, t),
    ),
    forkliftWait: sum(
      (s) => s.actor !== "checker" && s.stage.includes("queue"),
      (s) => elapsed(s, t),
    ),
    dockQueue: sum(
      (s) => s.stage === "dock queue",
      (s) => elapsed(s, t),
    ),
    dockIdle:
      t -
      sum(
        (s) => s.stage === "loading",
        (s) => elapsed(s, t),
      ),
  };
}
export function loadingFrame(run, time) {
  const t = Math.max(
    0,
    Math.min(Number.isFinite(time) ? time : 0, run.config.window),
  );
  function actor(id, home) {
    const own = run.tasks.filter((s) => s.actor === id),
      task = own.find((s) => s.start <= t && t < s.end);
    const last = own.filter((s) => s.end <= t).sort((a, b) => b.end - a.end)[0];
    const ratio = task ? (t - task.start) / (task.end - task.start) : 0;
    const position = task
      ? task.from.map((p, i) => p + (task.to[i] - p) * ratio)
      : last?.to || home;
    const job = task && run.jobs.find((j) => j.id === task.pallet);
    return {
      id,
      x: position[0],
      y: position[1],
      stage: task?.stage || "idle",
      pallet: task?.pallet || null,
      heading:
        task && task.distance > 0
          ? Math.atan2(task.to[1] - task.from[1], task.to[0] - task.from[0])
          : 0,
      carrying: !!job && job.pickedAt <= t && t < job.deliveredAt,
    };
  }
  return {
    time: t,
    forklifts: ["F1", "F2"].map((id) => actor(id, run.points.staging)),
    checker: actor("checker", run.points.station),
    counts: loadingMetrics(run, t),
  };
}
export function compareLoading(input = {}) {
  return {
    baseline: runLoading({ ...input, layout: BASELINE_LAYOUT }),
    proposal: runLoading({
      ...input,
      layout: input.proposal || PROPOSED_LAYOUT,
    }),
  };
}
