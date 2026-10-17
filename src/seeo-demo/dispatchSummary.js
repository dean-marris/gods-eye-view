// Fixed-window accounting from the same sampled trajectories as the comparison.
// Moving time counts actor-seconds in steps travelling at least 1 cm / 0.1 s.
export function summarizeDispatch(run) {
  const last = run.frames.at(-1)?.actors ?? [];
  const total = run.jobs.length;
  const summary = {
    personDistance: 0, personMovingSeconds: 0,
    vehicleDistance: 0, vehicleMovingSeconds: 0, vehicleWaiting: 0,
    completed: last.filter(a => a.status === 'complete').length,
    unfinished: 0, total, window: run.duration, completionSeconds: null,
  };
  summary.unfinished = total - summary.completed;
  for (const actor of last) {
    summary[`${actor.kind}Distance`] += actor.distance;
    if (actor.kind === 'vehicle') summary.vehicleWaiting += actor.waiting;
  }
  for (let i = 1; i < run.frames.length; i++) {
    const previous = run.frames[i - 1], current = run.frames[i];
    const dt = current.time - previous.time;
    for (const actor of current.actors) {
      const before = previous.actors.find(a => a.id === actor.id);
      if (before && actor.distance - before.distance >= 0.1 * dt - 1e-9)
        summary[`${actor.kind}MovingSeconds`] += dt;
    }
  }
  if (total > 0 && summary.unfinished === 0)
    summary.completionSeconds = run.frames.find(frame => frame.actors.filter(a => a.status === 'complete').length === total)?.time ?? null;
  return summary;
}
export function signedSaving(before, after) {
  const saved = before - after;
  return {value: Math.abs(saved) < 1e-8 ? 0 : saved, label: Math.abs(saved) < 1e-8 ? 'unchanged' : saved > 0 ? 'saved' : 'added'};
}
// One assumed load per forklift trip: picked at activation, delivered at destination.
// Queue admission is the pickup milestone; handling/service duration is not modeled.
export function countForkliftLoads(frame) {
  const vehicles = frame.actors.filter(actor => actor.kind === 'vehicle');
  return {
    picked: vehicles.filter(actor => ['active', 'complete'].includes(actor.status)).length,
    delivered: vehicles.filter(actor => actor.status === 'complete').length,
    remaining: vehicles.filter(actor => actor.status !== 'complete').length,
  };
}
