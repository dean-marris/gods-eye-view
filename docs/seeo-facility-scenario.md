# seeo facility scenario — local design prototype

## Design question

Does moving from a physical area to its events and camera context help a customer understand where to act? Dean asked to build out the previously discussed warehouse scenario. This first version is an illustrative, in-memory design demonstration, not a production seeo integration.

## Audience and scope

A warehouse safety or operations manager explores a synthetic distribution centre. The layout, camera placement, policies, events and evidence are explicitly fictitious. There is no customer map or camera footage in the checkout. No CRM, edge-device or analytics APIs are connected. No data is persisted or sent to a provider. The 3D model uses Cesium with local dimensions and no external map imagery or claimed site coordinates.

## Single bounded slice

Open Example Logistics — Distribution Centre, select an area in the 2D plan or 3D cutaway model, filter eight sample events by shift window, open a labelled evidence schematic, inspect illustrative camera policy and unavailable monitoring, and toggle a proposed barrier. The site now includes a truck yard, loading bays, pallet-filled racks, conveyors and a separate employee approach. The proposal does not alter event counts or predict improvement.

The 40-second simulated EX-003 replay includes two forklifts, two people and a yard vehicle. Plan, 3D and the event evidence schematic use the same authored paths and clock, with play/pause, restart, keyboard-accessible scrubbing, speed selection and jump-to-event. All routes and distances remain synthetic. See `seeo-replay-brief.md` for the bounded extension and verification requirements.

Acceptance walkthrough:

1. Open `/seeo-demo.html` on the existing Docker service and see the synthetic-data notice.
2. Dispatch crossing shows four events for the full shift and two in each half-shift.
3. Selecting an event opens its time, camera, area and illustrative distance threshold beside a clearly labelled schematic, not actual video.
4. Coverage step selects the rear service area, shows unavailable monitoring and unknown conditions, and makes estimated camera fields visible.
5. C03 has no distance threshold; show unavailable rather than inferring one.
6. Proposed barrier appears in plan and 3D. Its unvalidated status and the absence of an outcome prediction remain visible. Counts do not change.
7. Browser controls and plan targets are keyboard accessible; narrow screens stack the map and details.
8. Plan view remains usable if 3D cannot initialize.

## Run and verify

Use the existing Docker installation, not a host Node install:

```bash
cd /data/gods-eye-view
docker compose up -d --wait
```

Open http://127.0.0.1:4173/seeo-demo.html. The original globe remains at `/`. Build both entry points with `docker compose exec -T gods-eye-view npx vite build --config seeo-demo.vite.config.js`. The source is bind-mounted, so the existing service serves the prototype directly. The prototype is local only and not published to GitHub.

## Verification approach

This is a reversible visual prototype. Verify user-visible selection, filters, evidence, unknown states, barrier toggling, 3D and mobile layout in the browser. Deterministic replay behavior is tested with `docker compose exec -T gods-eye-view node --test src/seeo-demo/replay.test.mjs`; RED was observed before implementing the replay module. Build with the installed container dependencies. No production integration behavior or analytics accuracy is claimed.

## Next customer inputs

An authorized floor plan with scale or known dimensions; selected site and floor; camera IDs and surveyed positions; an approved event clip or metadata sample. Verify coordinate alignment, calibration and policy provenance before replacing fixtures with operational data. Keep customer plans and media outside the public repository.

## Production follow-up

Resolve the renderer/interaction design with Dean, then specify and ticket actual ingestion, site/camera identity, authorization, calibrated event placement and real evidence delivery. Connect canonical seeo Sites rather than introducing parallel customer identities. Before-and-after measures require exposure/availability context and must not infer causal benefit from a layout sketch.
