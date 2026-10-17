# Fictional distribution centre replay — one bounded prototype slice

Dean approved this extension on 17 October 2026. Continue the existing local prototype on Beast3's 8 TB drive, with one writer and the existing Docker runtime. No customer records, camera feeds, provider activation or public release are in scope.

## Deliverable

Example Logistics — Distribution Centre: receiving, racked storage, packing/conveyors, dispatch/loading bays, truck yard and a separate employee approach. Add a deterministic 40-second simulated crossing replay with two forklifts, two pedestrians and one truck. The same replay frame drives plan, Cesium model and the EX-003 evidence schematic.

## Acceptance

- Persistent fictional/simulated labels; no sample animation described as footage or live tracking.
- Play, pause, restart, scrub, speed and jump-to-event controls. Pausing freezes actor positions; reaching the end stops playback.
- EX-003 at +20 s maps to the same forklift/picker positions in all views and opens matching camera/policy context.
- Yard geometry, trucks, rack pallets, conveyors and camera mounts improve the scene while local coordinates remain synthetic.
- Unavailable camera and unmonitored region remain unknown; a hatched rack-occluded patch illustrates a potential blind spot rather than a calculated viewshed.
- Proposal changes geometry only; recorded fixtures, historical paths and counts remain unchanged.
- Controls work with keyboard and narrow screens; a non-3D plan remains usable.
- Observe RED/GREEN for deterministic playback and crossing-frame behavior. Verify installed Docker-served UI, build and no new browser errors. Record screenshot limitations truthfully if capture is still unavailable.

The replay is a design demonstration, not an inference engine, calibrated measurement or safety simulation. Model-space separation is calculated from authored fictional paths; it is not a camera measurement. Production integration remains a later, separately scoped ticket.
