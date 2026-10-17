import { routes } from "./replay.js";

export function routeMarkup(onlyCrossing = false) {
  return routes
    .filter((route) => !onlyCrossing || ["FL-01", "P-01"].includes(route.id))
    .map(
      (route) =>
        `<polyline points="${route.points.map((p) => `${p[1]},${p[2]}`).join(" ")}" fill="none" stroke="${route.color}" stroke-width=".25" stroke-dasharray=".7 .65" opacity=".6" pointer-events="none"/>`,
    )
    .join("");
}

export function actorMarkup(frame, onlyCrossing = false) {
  return frame.actors
    .filter((actor) => !onlyCrossing || ["FL-01", "P-01"].includes(actor.id))
    .map((actor) => {
      const shape =
        actor.kind === "person"
          ? `<g transform="rotate(${actor.heading})"><path d="M-.5 -.32L-.95 -.42M-.5 .32L-.95 .42" stroke="#273e53" stroke-width=".22"/><rect x="-.45" y="-.42" width=".8" height=".84" rx=".18" fill="#d5ef2e" stroke="#27454a" stroke-width=".09"/><path d="M-.12 -.38V.38" stroke="#fff" stroke-width=".12"/><path d="M0 -.47L.35 -.65M0 .47L.35 .65" stroke="#d5ef2e" stroke-width=".2"/><circle cx=".3" r=".3" fill="#ffca32" stroke="#8b6f28" stroke-width=".08"/></g>`
          : actor.kind === "truck"
            ? `<g transform="rotate(${actor.heading})"><rect x="-5" y="-1.25" width="10" height="2.5" rx=".15" fill="#dbe5eb" stroke="#526c7d" stroke-width=".14"/><path d="M-4.9 -1.1V1.1M-4.8 0H4.8" stroke="#91a7b4" stroke-width=".1"/></g><g transform="translate(${actor.cabX - actor.x} ${actor.cabY - actor.y}) rotate(${actor.cabHeading})"><rect x="-1.5" y="-1.2" width="3" height="2.4" rx=".25" fill="#226b89"/><rect x=".7" y="-.95" width=".5" height="1.9" fill="#acd5df"/><path d="M-.8 -1.35H.9M-.8 1.35H.9" stroke="#18272f" stroke-width=".22"/></g>`
            : `<g transform="rotate(${actor.heading})"><rect x="-1.5" y="-.85" width="2.5" height="1.7" rx=".2" fill="${actor.color}" stroke="#fff" stroke-width=".13"/><rect x="-1" y="-.98" width=".5" height=".25" fill="#18272f"/><rect x="-1" y=".73" width=".5" height=".25" fill="#18272f"/><rect x=".4" y="-.98" width=".5" height=".25" fill="#18272f"/><rect x=".4" y=".73" width=".5" height=".25" fill="#18272f"/><rect x="-.6" y="-.6" width=".8" height="1.2" fill="#354d59"/><circle r=".22" fill="#ffca32"/><path d="M1 -.75V.75" stroke="#273e48" stroke-width=".22"/><path d="M1 -.55H2.1M1 .55H2.1" stroke="#455d68" stroke-width=".16"/><rect x="1.3" y="-.75" width="1.2" height="1.5" fill="#c39a66" stroke="#8e704f" stroke-width=".12"/></g>`;
      return `<g class="simulated-actor" transform="translate(${actor.x} ${actor.y})" role="img" aria-label="Simulated ${actor.id}, ${actor.name}"><title>SIMULATED · ${actor.id} · ${actor.name}</title>${shape}<text x="0" y="-1.7" text-anchor="middle" font-size="1.1" fill="#183d4c" stroke="#fff" stroke-width=".35" paint-order="stroke">${actor.id}</text></g>`;
    })
    .join("");
}

export function evidenceReplayMarkup(frame) {
  return `<div class="evidence-visual"><div class="evidence-watermark">SIMULATED REPLAY · NOT CAMERA FOOTAGE</div><svg viewBox="38 13 42 40" aria-label="Simulated forklift and pedestrian crossing replay"><rect x="38" y="13" width="42" height="40" fill="#e8eef0"/><path d="M39 34H79M55 15V51" stroke="#d5e0e4" stroke-width="5"/><g fill="#fff">${Array.from({ length: 7 }, (_, i) => `<rect x="50" y="${29 + i * 1.3}" width="10" height=".65"/>`).join("")}</g>${routeMarkup(true)}<g id="evidence-replay-actors">${actorMarkup(frame, true)}</g></svg></div><div class="evidence-replay-controls"><button class="primary-button" id="evidence-replay-play">▶ Play simulation</button><label for="evidence-replay-time">Replay time</label><input id="evidence-replay-time" type="range" min="0" max="40" step="0.1" value="${frame.seconds}" aria-label="Evidence replay time in seconds"/><output id="evidence-replay-clock"></output></div>`;
}
