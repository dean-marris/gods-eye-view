import { loadingMetrics } from "./loading.js";
export const PRODUCTIVITY_METRICS = Object.freeze({
  delivered: { label: "Pallets loaded", unit: "pallets", higher: true },
  walkingMetres: { label: "Checker walking", unit: "m", higher: false },
  forkliftMetres: { label: "Forklift travel", unit: "m", higher: false },
  forkliftWait: {
    label: "Forklift queue wait",
    unit: "actor-s",
    higher: false,
  },
});
export function productivitySeries(run, metric) {
  const end = run.config.window;
  if (metric === "delivered") {
    let count = 0;
    const points = [{ time: 0, value: 0 }];
    for (const job of [...run.jobs].sort(
      (a, b) => a.deliveredAt - b.deliveredAt,
    )) {
      if (job.deliveredAt > end) break;
      points.push(
        { time: job.deliveredAt, value: count },
        { time: job.deliveredAt, value: ++count },
      );
    }
    points.push({ time: end, value: count });
    return points;
  }
  const boundaries = [
    ...new Set([
      0,
      end,
      ...run.tasks
        .flatMap((task) => [task.start, task.end])
        .filter((t) => t >= 0 && t <= end),
    ]),
  ].sort((a, b) => a - b);
  return boundaries.map((time) => ({
    time,
    value: loadingMetrics(run, time)[metric],
  }));
}
export function buildProductivity(comparison) {
  const series = Object.fromEntries(
    Object.keys(PRODUCTIVITY_METRICS).map((metric) => {
      const baseline = productivitySeries(comparison.baseline, metric);
      const proposal = productivitySeries(comparison.proposal, metric);
      return [
        metric,
        {
          baseline,
          proposal,
          max: Math.max(
            1,
            ...baseline.map((p) => p.value),
            ...proposal.map((p) => p.value),
          ),
        },
      ];
    }),
  );
  const b = comparison.baseline.metrics.completionTime,
    p = comparison.proposal.metrics.completionTime;
  return {
    comparison,
    series,
    window: comparison.baseline.config.window,
    completion: p,
    fullOrderSaving: b !== null && p !== null ? b - p : null,
  };
}
export function productivityAt(model, metric, time) {
  const t = Math.max(
    0,
    Math.min(Number.isFinite(time) ? time : 0, model.window),
  );
  const baseline = loadingMetrics(model.comparison.baseline, t)[metric];
  const proposal = loadingMetrics(model.comparison.proposal, t)[metric];
  return {
    time: t,
    baseline,
    proposal,
    benefit: PRODUCTIVITY_METRICS[metric].higher
      ? proposal - baseline
      : baseline - proposal,
  };
}
