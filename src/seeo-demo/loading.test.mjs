import test from "node:test";
import assert from "node:assert/strict";
import {
  runLoading,
  compareLoading,
  loadingFrame,
  loadingMetrics,
} from "./loading.js";

test("one pallet follows independently calculated pickup, inspection, dock and empty return milestones", () => {
  const run = runLoading({
    order: 1,
    window: 100,
    layout: { staging: 6, checker: 3 },
    forkliftSpeed: 2,
    walkingSpeed: 1,
    pickup: 2,
    inspection: 4,
    loading: 3,
  });
  // Pickup 0–2, loaded travel 2–5, checker walks 5–8,
  // inspection 8–12, dock travel 12–15, loading 15–18, empty return 18–24.
  assert.equal(run.jobs[0].pickedAt, 2);
  assert.equal(run.jobs[0].deliveredAt, 18);
  assert.equal(run.jobs[0].availableAt, 24);
  assert.equal(run.metrics.completionTime, 18);
  assert.equal(run.metrics.forkliftMetres, 24);
  assert.equal(run.metrics.walkingMetres, 6);
  assert.equal(run.metrics.forkliftWait, 3);
  assert.equal(loadingFrame(run, 1.99).counts.picked, 0);
  assert.equal(loadingFrame(run, 2).counts.picked, 1);
  assert.equal(loadingFrame(run, 18).counts.delivered, 1);
  assert.equal(loadingFrame(run, 19).forklifts[0].carrying, false);
});

test("full trailer and returned fleet are distinct milestones, both censored at the common window", () => {
  const run = runLoading({
    order: 1,
    window: 20,
    layout: { staging: 6, checker: 3 },
    forkliftSpeed: 2,
    walkingSpeed: 1,
    pickup: 2,
    inspection: 4,
    loading: 3,
  });
  assert.equal(run.metrics.completionTime, 18);
  assert.equal(run.metrics.returnCompletionTime, null);
  assert.equal(
    runLoading({ ...run.config, window: 24 }).metrics.returnCompletionTime,
    24,
  );
  assert.equal(
    runLoading({ ...run.config, window: 17 }).metrics.completionTime,
    null,
  );
});

test("same order and identities produce deterministic parity and immutable baseline under proposal edits", () => {
  const equal = compareLoading({ proposal: { staging: 24, checker: 12 } });
  assert.deepEqual(equal.baseline, equal.proposal);
  assert.deepEqual(
    equal,
    compareLoading({ proposal: { staging: 24, checker: 12 } }),
  );
  const changed = compareLoading({ proposal: { staging: 48, checker: 24 } });
  assert.deepEqual(changed.baseline, equal.baseline);
  assert.deepEqual(
    changed.proposal.jobs.map((j) => j.id),
    equal.baseline.jobs.map((j) => j.id),
  );
});

test("default layout saves real travel, walking and full loading time; a longer layout can lose", () => {
  const { baseline: b, proposal: p } = compareLoading();
  assert.equal(b.metrics.delivered, 24);
  assert.equal(p.metrics.delivered, 24);
  assert.ok(p.metrics.completionTime < b.metrics.completionTime);
  assert.equal(b.metrics.walkingMetres, 576);
  assert.equal(p.metrics.walkingMetres, 192);
  assert.equal(b.metrics.forkliftMetres, 1440);
  assert.equal(p.metrics.forkliftMetres, 864);
  const worse = compareLoading({
    proposal: { staging: 48, checker: 24 },
    window: 1800,
  });
  assert.ok(
    worse.proposal.metrics.completionTime >
      worse.baseline.metrics.completionTime,
  );
});

test("forklifts, checker round trips and dock bookings never overlap; second pallet queues", () => {
  const r = runLoading();
  for (const resource of ["F1", "F2", "checker", "dock"]) {
    const bookings = r.bookings
      .filter((b) => b.resource === resource)
      .sort((a, b) => a.start - b.start);
    assert.equal(bookings.length, resource.startsWith("F") ? 12 : 24);
    for (let i = 1; i < bookings.length; i++)
      assert.ok(bookings[i].start >= bookings[i - 1].end - 1e-9);
  }
  assert.ok(
    r.tasks.find((t) => t.pallet === "P02" && t.stage === "inspection queue")
      .end > 12,
  );
  assert.ok(
    runLoading({
      order: 12,
      layout: { staging: 2, checker: 0 },
      inspection: 0.1,
      loading: 30,
    }).metrics.dockQueue > 0,
  );
});

test("common-window clipping retains backlog, conserves pallets and permits reversible seeks", () => {
  const r = runLoading({ order: 48, window: 20 });
  assert.equal(r.metrics.completionTime, null);
  assert.ok(r.metrics.remaining > 0);
  for (const t of [0, 3.9, 4, 12, 19.9, 20, 8, 4]) {
    const f = loadingFrame(r, t),
      c = f.counts;
    assert.equal(c.notPicked + c.carrying + c.delivered, 48);
    assert.equal(f.forklifts.filter((a) => a.carrying).length, c.carrying);
    assert.deepEqual(f, loadingFrame(r, t));
  }
  const single = runLoading({
    order: 1,
    window: 3,
    layout: { staging: 6, checker: 3 },
    forkliftSpeed: 2,
    pickup: 2,
  });
  assert.equal(single.metrics.forkliftMetres, 2);
  assert.equal(single.metrics.walkingMetres, 0);
  assert.equal(single.metrics.delivered, 0);
});

test("inputs reject nonfinite, unbounded and fractional orders", () => {
  for (const input of [
    { order: Infinity },
    { order: 1.5 },
    { order: 0 },
    { window: NaN },
    { layout: { staging: 49 } },
    { layout: { checker: -1 } },
    { forkliftSpeed: 0 },
  ])
    assert.throws(() => runLoading(input), RangeError);
});

// Repeated seeks cannot corrupt a schedule or leak nonfinite counters.
test("nonfinite and negative seek times show the initial frame", () => {
  const run = runLoading();
  for (const time of [NaN, Infinity, -Infinity, -4]) {
    assert.deepEqual(loadingFrame(run, time), loadingFrame(run, 0));
    assert.deepEqual(loadingMetrics(run, time), loadingMetrics(run, 0));
  }
});
