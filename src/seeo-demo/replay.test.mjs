import test from "node:test";
import assert from "node:assert/strict";
import {
  getReplayFrame,
  initialReplay,
  reduceReplay,
  REPLAY_DURATION,
} from "./replay.js";

test("the crossing event uses the same simulated positions at 20 seconds", () => {
  const frame = getReplayFrame(20);
  const forklift = frame.actors.find((actor) => actor.id === "FL-01");
  const picker = frame.actors.find((actor) => actor.id === "P-01");
  assert.deepEqual([forklift.x, forklift.y], [55, 34]);
  assert.deepEqual([picker.x, picker.y], [55, 32.8]);
  assert.ok(Math.abs(frame.separation - 1.2) < 0.00001);
  assert.equal(frame.eventId, "EX-003");
  assert.equal(frame.phase, "crossing");
  assert.equal(frame.simulated, true);
});

test("pause freezes playback, seeking is bounded, and reaching the end stops playback", () => {
  let state = reduceReplay(initialReplay(), { type: "play" });
  state = reduceReplay(state, { type: "tick", seconds: 5 });
  assert.equal(state.seconds, 5);
  state = reduceReplay(state, { type: "pause" });
  assert.equal(reduceReplay(state, { type: "tick", seconds: 5 }).seconds, 5);
  state = reduceReplay(state, { type: "seek", seconds: 500 });
  assert.equal(state.seconds, REPLAY_DURATION);
  state = reduceReplay(state, { type: "play" });
  assert.equal(state.seconds, 0);
  state = reduceReplay(state, { type: "tick", seconds: 100 });
  assert.equal(state.seconds, 40);
  assert.equal(state.playing, false);
});

test("invalid input cannot create nonfinite replay positions or time", () => {
  assert.equal(
    reduceReplay(initialReplay(), { type: "seek", seconds: NaN }).seconds,
    0,
  );
  const frame = getReplayFrame(-9);
  assert.equal(frame.seconds, 0);
  for (const actor of frame.actors) {
    assert.ok(
      Number.isFinite(actor.x) &&
        Number.isFinite(actor.y) &&
        Number.isFinite(actor.heading),
    );
  }
  assert.equal(getReplayFrame(Infinity).seconds, 0);
});

test("one frame contains all twelve actors and follows the authored route endpoints", () => {
  const frame = getReplayFrame(20);
  assert.equal(frame.actors.length, 12);
  assert.equal(
    frame.actors.find((actor) => actor.id === "TR-01").kind,
    "truck",
  );
  assert.equal(getReplayFrame(5).actors[0].x, 43);
  const end = getReplayFrame(40);
  assert.deepEqual([end.actors[0].x, end.actors[0].y], [73, 34]);
  const truck = end.actors.find((actor) => actor.id === "TR-01");
  assert.deepEqual([truck.x, truck.y], [89.5, 26.5]);
});

test("truck reverses trailer-first into Bay 1 and straightens the articulated cab", () => {
  const truckAt = (seconds) =>
    getReplayFrame(seconds).actors.find((a) => a.id === "TR-01");
  const turning = truckAt(22);
  assert.equal(turning.motion, "reversing");
  assert.ok(Math.abs(turning.cabHeading - turning.heading) > 10);
  const aligned = truckAt(34),
    docked = truckAt(40);
  assert.equal(aligned.heading, 0);
  assert.ok(
    docked.x < aligned.x,
    "reverse motion is opposite the forward-facing cab",
  );
  assert.equal(docked.motion, "docked");
  assert.equal(docked.heading, 0);
  assert.equal(docked.cabHeading, 0);
  assert.deepEqual([docked.x - 5, docked.y], [84.5, 26.5]);
  for (let t = 0; t <= 40; t += 0.25) {
    const truck = truckAt(t);
    assert.ok(Number.isFinite(truck.cabX) && Number.isFinite(truck.cabY));
    const hitchX = truck.x + 4.5 * Math.cos((truck.heading * Math.PI) / 180);
    const hitchY = truck.y + 4.5 * Math.sin((truck.heading * Math.PI) / 180);
    assert.ok(
      Math.abs(Math.hypot(truck.cabX - hitchX, truck.cabY - hitchY) - 1.4) <
        1e-8,
    );
  }
});

test("every moving reverse segment travels opposite the trailer forward direction", () => {
  const at = (t) => getReplayFrame(t).actors.find((a) => a.id === "TR-01");
  for (let t = 12; t < 37.9; t += 0.1) {
    const a = at(t),
      b = at(t + 0.01),
      angle = (a.heading * Math.PI) / 180;
    assert.ok(
      (b.x - a.x) * Math.cos(angle) + (b.y - a.y) * Math.sin(angle) < 0,
      `must reverse at ${t}`,
    );
  }
});

test("busy shift includes four forklifts, seven people and the docking truck", () => {
  const frame = getReplayFrame(18);
  assert.equal(frame.actors.filter((a) => a.kind === "forklift").length, 4);
  assert.equal(frame.actors.filter((a) => a.kind === "person").length, 7);
  assert.equal(new Set(frame.actors.map((a) => a.id)).size, 12);
});
