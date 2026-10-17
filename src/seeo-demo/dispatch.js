// Metres and seconds in a fictional dispatch bay. Renderer-independent fixed-step trial.
export const STEP = 0.1;
export const BASELINE = Object.freeze({
  barrier: false,
  gate: false,
  speed: 3,
  yielding: 0.35,
  compliance: 1,
});
const finite = (x, fallback, min, max) =>
  Number.isFinite(Number(x))
    ? Math.min(max, Math.max(min, Number(x)))
    : fallback;
export function createWorkload({ seed = 42, demand = "normal" } = {}) {
  let state = finite(seed, 42, 1, 2147483646) | 0;
  const random = () =>
    ((state = (Math.imul(state, 1664525) + 1013904223) | 0) >>> 0) / 4294967296;
  const count = { low: 12, normal: 28, peak: 60 }[demand] ?? 28;
  return Object.freeze(
    Array.from({ length: count }, (_, i) =>
      Object.freeze({
        id: `${i % 2 ? "P" : "F"}${String(i + 1).padStart(2, "0")}`,
        kind: i % 2 ? "person" : "vehicle",
        arrival: Math.round((i * 1.6 + random() * 1.5) * 10) / 10,
        direction: Math.floor(i / 2) % 2 ? -1 : 1,
        obedience: random(),
        yieldDecision: random(),
      }),
    ),
  );
}
export function compareDispatch({
  workload = createWorkload(),
  proposal = {},
  duration = 120,
  threshold = 3,
} = {}) {
  return {
    baseline: simulateDispatch({
      workload,
      duration,
      threshold,
      config: BASELINE,
    }),
    proposal: simulateDispatch({
      workload,
      duration,
      threshold,
      // The bypass trial isolates routing; legacy experiments may vary speed.
      config: { ...BASELINE, ...proposal, ...(proposal.routeMode === "bypass" ? {speed: BASELINE.speed} : {}) },
    }),
  };
}
export function dispatchGeometry(config = {}) {
  const bypass = config.routeMode === "bypass";
  const personPath = bypass ? [[0, -8], [30, -8], [30, 8], [0, 8]] : config.barrier ? [[0, -8], [8, -8], [8, 8], [0, 8]] : [[0, -8], [0, 8]];
  // Locate an actual transverse path segment in the bounded forklift corridor.
  // The perimeter segment at x=30 has no intersection and hence no mixed zone.
  const transverse = personPath.find((p, i) => i > 0 && p[0] === personPath[i - 1][0] && Math.min(p[1], personPath[i-1][1]) < -3.4 && Math.max(p[1], personPath[i-1][1]) > 3.4 && Math.abs(p[0]) <= 25.5 + .35);
  const crossing = transverse?.[0] ?? null;
  return {
    bounds: { x: -28, y: -12, width: 62, height: 24 },
    crossing,
    personPath,
    barriers: bypass ? [[[-26, -4], [27, -4], [27, 4], [-26, 4]]] : config.barrier ? [[[-23, -4], [7, -4]], [[9, -4], [23, -4]], [[-23, 4], [7, 4]], [[9, 4], [23, 4]]] : [],
  };
}
function route(job, config) {
  const d = job.direction;
  return job.kind === "vehicle"
    ? [
        [-24 * d, -1.6 * d],
        [24 * d, -1.6 * d],
      ]
    : dispatchGeometry(config).personPath.map(([x, y]) => [x, y * d]);
}
function pointAt(points, distance) {
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i - 1],
      [xx, yy] = points[i],
      length = Math.hypot(xx - x, yy - y);
    if (distance <= length)
      return {
        x: x + ((xx - x) * distance) / length,
        y: y + ((yy - y) * distance) / length,
        heading: Math.atan2(yy - y, xx - x),
      };
    distance -= length;
  }
  const p = points.at(-1);
  return { x: p[0], y: p[1], heading: 0 };
}
export function simulateDispatch({
  workload = createWorkload(),
  config = BASELINE,
  duration = 120,
  threshold = 3,
} = {}) {
  const c = {
    routeMode: config.routeMode === "bypass" ? "bypass" : "crossing",
    barrier: config.routeMode === "bypass" || !!config.barrier,
    gate: config.routeMode !== "bypass" && !!config.gate,
    speed: finite(config.speed, 3, 0.5, 5),
    yielding: finite(config.yielding, 0.35, 0, 1),
    compliance: finite(config.compliance, 1, 0, 1),
  };
  duration = Math.round(finite(duration, 120, 1, 240) / STEP) * STEP;
  threshold = finite(threshold, 3, 0.5, 10);
  const jobs = workload.map((j, i) => ({
    id: String(j.id ?? i),
    kind: j.kind === "person" ? "person" : "vehicle",
    arrival: finite(j.arrival, 0, 0, 10000),
    direction: j.direction === -1 ? -1 : 1,
    obedience: finite(j.obedience, 0, 0, 1),
    yieldDecision: finite(j.yieldDecision, 0, 0, 1),
  }));
  const geometry = dispatchGeometry(c);
  const crossing = geometry.crossing;
  const actors = jobs.map((j) => {
    const path = route(j, c),
      length = path
        .slice(1)
        .reduce(
          (sum, p, i) => sum + Math.hypot(p[0] - path[i][0], p[1] - path[i][1]),
          0,
        );
    // Conservative circular footprints: loaded forklift radius 1.5 m, pedestrian 0.35 m.
    const radius = j.kind === "vehicle" ? 1.5 : 0.35;
    const entry = crossing === null ? Infinity :
      j.kind === "vehicle"
        ? 24 + crossing * j.direction - 1.5 - radius
        : (c.barrier ? 8 : 0) + 8 - 3.5 - radius;
    const exit = crossing === null ? Infinity :
      j.kind === "vehicle"
        ? 24 + crossing * j.direction + 1.5 + radius
        : (c.barrier ? 8 : 0) + 8 + 3.5 + radius;
    return {
      ...j,
      path,
      length,
      radius,
      entry,
      exit,
      s: 0,
      speed: 0,
      status: "pending",
      waiting: 0,
    };
  });
  const frames = [];
  let gatePhase = null;
  const capture = (time) => ({
    time,
    gatePhase,
    actors: actors.map((a) => ({
      id: a.id,
      kind: a.kind,
      ...pointAt(a.path, a.s),
      status: a.status,
      speed: a.speed,
      distance: a.s,
      waiting: a.waiting,
      inConflict: a.status === "active" && a.s > a.entry && a.s < a.exit,
    })),
  });
  frames.push(capture(0));
  for (let tick = 1; tick <= Math.round(duration / STEP); tick++) {
    const time = Math.round(tick * STEP * 10) / 10;
    for (const a of actors)
      if (["pending", "queued"].includes(a.status) && a.arrival < time) {
        const blocked = actors.some(
          (b) =>
            b !== a &&
            b.status === "active" &&
            b.kind === a.kind &&
            b.direction === a.direction &&
            b.s < a.radius + b.radius + 0.5,
        );
        a.status = blocked ? "queued" : "active";
        if (blocked) a.waiting += STEP;
      }
    const active = actors.filter((a) => a.status === "active");
    const inside = active.filter((a) => a.s > a.entry && a.s < a.exit);
    // Gate grants a kind-exclusive phase. Clear the complete buffered zone before changing phase.
    const candidates = active
      .filter((a) => a.s <= a.entry && a.entry - a.s < 8)
      .sort((a, b) => b.waiting - a.waiting || a.arrival - b.arrival);
    const phase = inside[0]?.kind ?? candidates[0]?.kind;
    gatePhase = c.gate ? (phase ?? null) : null;
    const moves = new Map();
    for (const a of active) {
      let limit = a.length;
      if (
        c.gate &&
        (c.compliance === 1 || a.obedience < c.compliance) &&
        a.s <= a.entry &&
        phase !== a.kind
      )
        limit = Math.min(limit, a.entry);
      if (
        !c.gate &&
        a.kind === "vehicle" &&
        (c.yielding === 1 || a.yieldDecision < c.yielding) &&
        a.s <= a.entry &&
        active.some(
          (p) => p.kind === "person" && p.s >= p.entry - 1 && p.s < p.exit,
        )
      )
        limit = Math.min(limit, a.entry);
      // Same-lane leaders retain footprint clearance; all updates use the previous step.
      for (const b of active)
        if (
          b !== a &&
          b.kind === a.kind &&
          b.direction === a.direction &&
          b.s > a.s
        )
          limit = Math.min(limit, b.s - a.radius - b.radius - 0.5);
      const remaining = Math.max(0, limit - a.s),
        maxSpeed = a.kind === "person" ? 1.35 : c.speed;
      const acceleration = a.kind === "person" ? 1.5 : 1,
        braking = a.kind === "person" ? 2 : 2;
      const speed = Math.min(
        maxSpeed,
        a.speed + acceleration * STEP,
        Math.sqrt(2 * braking * remaining),
      );
      moves.set(a.id, Math.max(0, Math.min(remaining, speed * STEP)));
    }
    for (const a of active) {
      const distance = moves.get(a.id);
      a.s += distance;
      a.speed = distance / STEP;
      if (distance < 0.01 && a.s < a.length - 0.001) a.waiting += STEP;
      if (a.s >= a.length - 0.000001) {
        a.s = a.length;
        a.status = "complete";
      }
    }
    frames.push(capture(time));
  }
  return {
    jobs,
    config: c,
    duration,
    threshold,
    crossing,
    geometry,
    frames,
    metrics: measureTrajectories(frames, { threshold, jobs }),
  };
}
export function measureTrajectories(frames, { threshold = 3, jobs = [] } = {}) {
  const events = [],
    open = new Map();
  let exposureSeconds = 0,
    coOccupancySeconds = 0;
  for (let i = 0; i < frames.length - 1; i++) {
    const frame = frames[i],
      dt = frames[i + 1].time - frame.time;
    const people = frame.actors.filter(
        (a) => a.kind === "person" && a.status === "active",
      ),
      vehicles = frame.actors.filter(
        (a) => a.kind === "vehicle" && a.status === "active",
      );
    const near = new Set();
    if (people.some((a) => a.inConflict) && vehicles.some((a) => a.inConflict))
      coOccupancySeconds += dt;
    for (const p of people)
      for (const v of vehicles)
        if (Math.hypot(p.x - v.x, p.y - v.y) < threshold) {
          const key = `${p.id}/${v.id}`;
          near.add(key);
          exposureSeconds += dt;
          if (!open.has(key)) {
            const event = {
              ids: [p.id, v.id],
              start: frame.time,
              end: frame.time + dt,
              duration: dt,
            };
            events.push(event);
            open.set(key, event);
          } else {
            const event = open.get(key);
            event.end = frame.time + dt;
            event.duration += dt;
          }
        }
    for (const key of open.keys()) if (!near.has(key)) open.delete(key);
  }
  const last = frames.at(-1)?.actors ?? [],
    completed = last.filter((a) => a.status === "complete").length;
  return {
    encounters: events.length,
    events,
    exposureSeconds,
    coOccupancySeconds,
    personWaiting: last
      .filter((a) => a.kind === "person")
      .reduce((s, a) => s + a.waiting, 0),
    vehicleWaiting: last
      .filter((a) => a.kind === "vehicle")
      .reduce((s, a) => s + a.waiting, 0),
    distance: last.reduce((s, a) => s + a.distance, 0),
    completed,
    total: jobs.length || last.length,
    backlog: (jobs.length || last.length) - completed,
  };
}
export function getDispatchFrame(run, time) {
  return run.frames[
    Math.min(
      run.frames.length - 1,
      Math.max(0, Math.round(finite(time, 0, 0, run.duration) / STEP)),
    )
  ];
}
