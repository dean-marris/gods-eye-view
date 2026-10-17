import test from "node:test";
import assert from "node:assert/strict";
import {
  createWorkload,
  compareDispatch,
  simulateDispatch,
  measureTrajectories,
  getDispatchFrame,
} from "./dispatch.js";

test("one frozen seeded workload is replayed identically when intervention is disabled", () => {
  const workload = createWorkload({ seed: 42, demand: "normal" });
  const result = compareDispatch({
    workload,
    proposal: { barrier: false, gate: false },
  });
  assert.deepEqual(result.baseline, result.proposal);
  assert.deepEqual(result.baseline.jobs, workload);
  assert.deepEqual(
    compareDispatch({ workload, proposal: { barrier: false, gate: false } }),
    result,
  );
});

test("a compliant barrier/gate changes movement, excludes mixed zone occupancy and finishes low demand", () => {
  const workload = createWorkload({ demand: "low" });
  const { baseline, proposal } = compareDispatch({
    workload,
    proposal: { barrier: true, gate: true, compliance: 1, yielding: 1 },
  });
  assert.deepEqual(proposal.jobs, baseline.jobs);
  assert.notDeepEqual(proposal.frames, baseline.frames);
  assert.equal(proposal.metrics.coOccupancySeconds, 0);
  assert.equal(proposal.metrics.completed, workload.length);
  assert.ok(proposal.metrics.distance > baseline.metrics.distance);
  assert.ok(
    proposal.frames
      .flatMap((f) => f.actors)
      .filter(
        (a) =>
          a.kind === "person" && a.status === "active" && Math.abs(a.y) < 3,
      )
      .every((a) => a.x === 8),
  );
});

test("proposal edits leave baseline invariant and short trials account for every unfinished job", () => {
  const workload = createWorkload({ demand: "peak" });
  const first = compareDispatch({
    workload,
    duration: 15,
    proposal: { barrier: true, gate: true, speed: 1 },
  });
  const second = compareDispatch({
    workload,
    duration: 15,
    proposal: { barrier: false, speed: 5, yielding: 0 },
  });
  assert.deepEqual(first.baseline, second.baseline);
  assert.equal(first.proposal.metrics.total, 60);
  assert.equal(
    first.proposal.metrics.completed + first.proposal.metrics.backlog,
    60,
  );
  assert.ok(first.proposal.metrics.backlog > 0);
  assert.equal(first.proposal.frames.at(-1).actors.length, 60);
});

test("accounting uses pair episodes, pair-seconds, union zone seconds and travelled metres", () => {
  const actor = (
    id,
    kind,
    x,
    y,
    distance = 0,
    waiting = 0,
    status = "active",
  ) => ({ id, kind, x, y, distance, waiting, status, inConflict: x === 0 });
  const frames = [
    {
      time: 0,
      actors: [actor("P", "person", 0, 0), actor("V", "vehicle", 0, 2)],
    },
    {
      time: 1,
      actors: [actor("P", "person", 0, 1, 1), actor("V", "vehicle", 0, 2)],
    },
    {
      time: 2,
      actors: [actor("P", "person", 5, 1, 6), actor("V", "vehicle", 0, 2)],
    },
    {
      time: 3,
      actors: [actor("P", "person", 1, 1, 10), actor("V", "vehicle", 0, 2)],
    },
    {
      time: 4,
      actors: [
        actor("P", "person", 2, 1, 11, 1, "complete"),
        actor("V", "vehicle", 0, 2, 0, 4),
      ],
    },
  ];
  const m = measureTrajectories(frames, { threshold: 3 });
  assert.equal(m.encounters, 2);
  assert.equal(m.exposureSeconds, 3);
  assert.equal(m.coOccupancySeconds, 2);
  assert.equal(m.distance, 11);
  assert.equal(m.personWaiting, 1);
  assert.equal(m.vehicleWaiting, 4);
  assert.equal(m.completed, 1);
  assert.equal(m.backlog, 1);
  assert.deepEqual(
    m.events.map((e) => [e.start, e.end]),
    [
      [0, 2],
      [3, 4],
    ],
  );
});

test("finite bounded settings, frame seeks and actual event actor positions remain consistent", () => {
  const result = simulateDispatch({
    duration: NaN,
    threshold: Infinity,
    config: { speed: NaN, yielding: Infinity, compliance: -5 },
    workload: createWorkload(),
  });
  assert.ok(
    result.frames.every((f) =>
      f.actors.every((a) =>
        [a.x, a.y, a.distance, a.waiting, a.heading].every(Number.isFinite),
      ),
    ),
  );
  assert.equal(getDispatchFrame(result, -50).time, 0);
  assert.equal(getDispatchFrame(result, Infinity).time, 0);
  assert.equal(getDispatchFrame(result, 10000).time, 120);
  assert.ok(result.metrics.events.length > 0);
  for (const event of result.metrics.events) {
    const frame = getDispatchFrame(result, event.start),
      [a, b] = event.ids.map((id) => frame.actors.find((a) => a.id === id));
    assert.equal(a.status, "active");
    assert.equal(b.status, "active");
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < result.threshold);
  }
});

test("coincident arrivals queue and same-lane actor footprints keep clearance", () => {
  const workload = Array.from({ length: 8 }, (_, i) => ({
    id: `F${i}`,
    kind: "vehicle",
    arrival: 0,
    direction: 1,
  }));
  const run = simulateDispatch({ workload, config: { speed: 3 } });
  assert.ok(
    run.frames.some((f) => f.actors.some((a) => a.status === "queued")),
  );
  assert.ok(run.metrics.vehicleWaiting > 0);
  for (const frame of run.frames) {
    const active = frame.actors.filter((a) => a.status === "active");
    for (let i = 0; i < active.length; i++)
      for (let j = i + 1; j < active.length; j++)
        assert.ok(
          Math.hypot(active[i].x - active[j].x, active[i].y - active[j].y) >=
            3.5 - 1e-8,
        );
  }
  assert.equal(run.metrics.completed, 8);
});

test("gate exclusion holds in both direct and channelled peak trials at full compliance", () => {
  for (const barrier of [false, true]) {
    const run = simulateDispatch({
      workload: createWorkload({ demand: "peak" }),
      config: { barrier, gate: true, compliance: 1, speed: 5 },
    });
    assert.equal(run.metrics.coOccupancySeconds, 0);
    assert.ok(run.frames.some((f) => f.gatePhase === "person"));
    assert.ok(run.frames.some((f) => f.gatePhase === "vehicle"));
    assert.equal(run.metrics.completed + run.metrics.backlog, 60);
  }
});
