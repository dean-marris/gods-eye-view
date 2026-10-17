// Authored fictional routes. This is animation, not inference or safety prediction.
export const REPLAY_DURATION = 40;
export const REPLAY_EVENT_TIME = 20;
export const routes = [
  {
    id: "FL-01",
    kind: "forklift",
    name: "Dispatch forklift",
    color: "#d48c2d",
    points: [
      [0, 40, 34],
      [10, 46, 34],
      [20, 55, 34],
      [30, 67, 34],
      [40, 73, 34],
    ],
  },
  {
    id: "P-01",
    kind: "person",
    name: "Picker at crossing",
    color: "#147f85",
    points: [
      [0, 55, 18],
      [10, 55, 24],
      [20, 55, 32.8],
      [30, 55, 41],
      [40, 55, 48],
    ],
  },
  {
    id: "FL-02",
    kind: "forklift",
    name: "Receiving forklift",
    color: "#af762a",
    points: [
      [0, 8, 12],
      [12, 19, 12],
      [22, 27, 17.7],
      [32, 38, 17.7],
      [40, 44, 22],
    ],
  },
  {
    id: "P-02",
    kind: "person",
    name: "Packing operator",
    color: "#497fa8",
    points: [
      [0, 30, 15],
      [14, 42, 15],
      [28, 50, 15],
      [40, 58, 15],
    ],
  },
  {
    id: "TR-01",
    kind: "truck",
    name: "Truck & trailer · Bay 1",
    color: "#6c8395",
    points: [
      [0, 105, 52, -90, -90],
      [8, 105, 28, -90, -90],
      [12, 105, 24, -90, -90],
      [20, 102, 29, -55, -20],
      [28, 98, 27.5, -20, 5],
      [34, 93, 26.5, 0, 0],
      [38, 89.5, 26.5, 0, 0],
      [40, 89.5, 26.5, 0, 0],
    ],
  },
];

// Additional authored shift activity; these are not extra detected events.
routes.push(
  {
    id: "FL-03",
    kind: "forklift",
    name: "Storage replenishment",
    color: "#d48c2d",
    points: [
      [0, 14, 47],
      [12, 14, 37],
      [24, 14, 29],
      [40, 14, 20],
    ],
  },
  {
    id: "FL-04",
    kind: "forklift",
    name: "Outbound pallet staging",
    color: "#e1a13a",
    points: [
      [0, 69, 45],
      [12, 69, 38],
      [26, 74, 33],
      [40, 78, 33],
    ],
  },
  {
    id: "P-03",
    kind: "person",
    name: "Aisle picker",
    color: "#497fa8",
    points: [
      [0, 23, 46],
      [18, 23, 35],
      [40, 23, 20],
    ],
  },
  {
    id: "P-04",
    kind: "person",
    name: "Dispatch checker",
    color: "#147f85",
    points: [
      [0, 79, 44],
      [20, 79, 36],
      [40, 79, 24],
    ],
  },
  {
    id: "P-05",
    kind: "person",
    name: "Packing worker",
    color: "#497fa8",
    points: [
      [0, 37, 14],
      [14, 39, 14],
      [28, 37, 14],
      [40, 39, 14],
    ],
  },
  {
    id: "P-06",
    kind: "person",
    name: "Receiving checker",
    color: "#147f85",
    points: [
      [0, 5, 18],
      [20, 16, 18],
      [40, 26, 18],
    ],
  },
  {
    id: "P-07",
    kind: "person",
    name: "Walkway approach",
    color: "#497fa8",
    points: [
      [0, 53, 50],
      [18, 53, 42],
      [28, 53, 37],
      [40, 53, 27],
    ],
  },
);

const boundedTime = (value) =>
  Number.isFinite(value) ? Math.max(0, Math.min(REPLAY_DURATION, value)) : 0;

export function initialReplay() {
  return { seconds: 0, playing: false, speed: 1 };
}

export function reduceReplay(state, action) {
  switch (action.type) {
    case "play":
      return {
        ...state,
        playing: true,
        seconds: state.seconds >= REPLAY_DURATION ? 0 : state.seconds,
      };
    case "pause":
      return { ...state, playing: false };
    case "reset":
      return initialReplay();
    case "seek":
      return { ...state, seconds: boundedTime(action.seconds), playing: false };
    case "speed":
      return {
        ...state,
        speed: [0.5, 1, 2].includes(action.speed) ? action.speed : state.speed,
      };
    case "tick": {
      if (
        !state.playing ||
        !Number.isFinite(action.seconds) ||
        action.seconds <= 0
      )
        return state;
      const seconds = boundedTime(state.seconds + action.seconds * state.speed);
      return { ...state, seconds, playing: seconds < REPLAY_DURATION };
    }
    default:
      return state;
  }
}

function positionAt(route, seconds) {
  const end = route.points.findIndex((point) => point[0] > seconds);
  const next = end === -1 ? route.points.length - 1 : Math.max(1, end);
  const a = route.points[next - 1],
    b = route.points[next];
  const fraction = Math.max(0, Math.min(1, (seconds - a[0]) / (b[0] - a[0])));
  const actor = {
    id: route.id,
    kind: route.kind,
    name: route.name,
    color: route.color,
    x: a[1] + (b[1] - a[1]) * fraction,
    y: a[2] + (b[2] - a[2]) * fraction,
    heading: (Math.atan2(b[2] - a[2], b[1] - a[1]) * 180) / Math.PI,
  };
  if (route.kind === "truck") {
    actor.heading = a[3] + (b[3] - a[3]) * fraction;
    actor.cabHeading = a[4] + (b[4] - a[4]) * fraction;
    const trailerAngle = (actor.heading * Math.PI) / 180;
    const cabAngle = (actor.cabHeading * Math.PI) / 180;
    actor.cabX =
      actor.x + 4.5 * Math.cos(trailerAngle) + 1.4 * Math.cos(cabAngle);
    actor.cabY =
      actor.y + 4.5 * Math.sin(trailerAngle) + 1.4 * Math.sin(cabAngle);
    actor.motion =
      seconds < 12 ? "positioning" : seconds < 38 ? "reversing" : "docked";
  }
  return actor;
}

export function getReplayFrame(value) {
  const seconds = boundedTime(value);
  const actors = routes.map((route) => positionAt(route, seconds));
  const [forklift, picker] = actors;
  return {
    seconds,
    simulated: true,
    actors,
    eventId: "EX-003",
    separation: Math.hypot(forklift.x - picker.x, forklift.y - picker.y),
    phase: seconds < 16 ? "approach" : seconds <= 24 ? "crossing" : "clear",
  };
}
