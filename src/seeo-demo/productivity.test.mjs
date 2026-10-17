import test from "node:test";
import assert from "node:assert/strict";
import { runLoading, compareLoading } from "./loading.js";
import { productivitySeries } from "./productivity.js";
const single = () =>
  runLoading({
    order: 1,
    window: 20,
    layout: { staging: 6, checker: 3 },
    forkliftSpeed: 2,
    walkingSpeed: 1,
    pickup: 2,
    inspection: 4,
    loading: 3,
  });
test("chart counts step only at the independently known 18-second delivery", () => {
  const points = productivitySeries(single(), "delivered");
  assert.deepEqual(
    points.filter((p) => p.time === 18),
    [
      { time: 18, value: 0 },
      { time: 18, value: 1 },
    ],
  );
  assert.ok(points.filter((p) => p.time < 18).every((p) => p.value === 0));
  assert.deepEqual(points.at(-1), { time: 20, value: 1 });
});
test("cost curves preserve interval slopes and clipped endpoints without premature travel", () => {
  const walk = productivitySeries(single(), "walkingMetres");
  assert.deepEqual(
    walk.find((p) => p.time === 5),
    { time: 5, value: 0 },
  );
  assert.deepEqual(
    walk.find((p) => p.time === 8),
    { time: 8, value: 3 },
  );
  assert.deepEqual(walk.at(-1), { time: 20, value: 6 });
  assert.deepEqual(productivitySeries(single(), "forkliftMetres").at(-1), {
    time: 20,
    value: 16,
  });
  assert.deepEqual(productivitySeries(single(), "forkliftWait").at(-1), {
    time: 20,
    value: 3,
  });
});
test("comparison exposes finite shared domains, signed benefits and a censored completion jump", async () => {
  const { buildProductivity, productivityAt } = await import(
    "./productivity.js"
  );
  const equal = buildProductivity(
    compareLoading({ proposal: { staging: 24, checker: 12 } }),
  );
  assert.equal(productivityAt(equal, "delivered", 0).benefit, 0);
  assert.equal(productivityAt(equal, "forkliftWait", 600).benefit, 0);
  const worse = buildProductivity(
    compareLoading({ window: 1800, proposal: { staging: 48, checker: 24 } }),
  );
  assert.ok(productivityAt(worse, "walkingMetres", 1800).benefit < 0);
  assert.ok(productivityAt(worse, "delivered", 100).benefit <= 0);
  const short = buildProductivity(compareLoading({ window: 10 }));
  assert.equal(short.completion, null);
  assert.equal(short.fullOrderSaving, null);
  for (const series of Object.values(short.series)) {
    assert.ok(series.max >= 1 && Number.isFinite(series.max));
    for (const side of ["baseline", "proposal"]) {
      assert.ok(
        series[side].every(
          (p, i, a) =>
            Number.isFinite(p.value) &&
            p.time >= 0 &&
            p.time <= 10 &&
            (!i || p.time >= a[i - 1].time),
        ),
      );
    }
  }
  const normal = buildProductivity(compareLoading());
  assert.equal(
    normal.completion,
    normal.comparison.proposal.metrics.completionTime,
  );
  assert.equal(
    productivityAt(normal, "delivered", normal.completion).proposal,
    24,
  );
  assert.ok(
    productivityAt(normal, "delivered", normal.completion).baseline < 24,
  );
  assert.deepEqual(
    normal.series.delivered.baseline,
    equal.series.delivered.baseline,
  );
});
