# seeo Facility Intelligence

**Explore a facility. Test a workflow change. See the effect on movement, waiting and completed work.**

A browser-based warehouse and distribution-centre demonstration built on [God’s Eye View](https://github.com/bilawalsidhu/gods-eye-view) and Cesium. It combines a complete plan/3D facility, camera context, moving people and vehicles, and integrated before-and-after trailer-loading and dispatch-crossing simulations.

[Open the live demo](https://seeo-facility-demo.dean501646.chatgpt.site/) · [Installation and operating guide](docs/seeo-demo.md) · [Original God’s Eye View README](README.upstream.md)

> **Use branch `seeo/facility-scenario-prototype`.** The seeo implementation is on this branch; `main` retains the upstream project. This is a fictional simulation prototype, with no customer footage, production seeo connection or measured customer outcomes.

## What the solution does

The demonstration helps operations and health-and-safety teams examine a proposed change in context: where people walk, where forklifts wait, how much work completes, and where traffic interacts.

| Capability | What you can explore |
| --- | --- |
| Whole-facility plan and 3D model | Receiving, storage aisles, rear service area, packing cells, dispatch crossing, dispatch bays and truck yard |
| Sensor fusion layer | Animated camera, conveyor PLC, sensor and Wi-Fi inputs into seeoHub, then a distinct adjacent seeo Fusion node, in Plan and 3D |
| Camera context | Selectable camera markers and seven distinct AI-generated, static area images |
| Recognizable activity | Four forklifts, seven people and an articulated truck reversing into Bay 1 in the facility replay |
| Scenario playback | Default separated people/forklift work flow, protected perimeter route and repeating pickup/drop-off circuits; original crossing and truck docking remain selectable |
| Integrated analysis | Open **Test a change** inside the facility; switch between **Trailer loading** and **Dispatch crossing** |
| Interactive productivity graph | Before/proposed progress curves linked to the replay, with selectable loads, walking, travel and queue measures; proposed-layout graphic explains the changes |
| Complete loading workflow | Pickup dwell, loaded travel, checker walking/inspection, queues, dock loading and empty return; stock moves into the trailer |
| Before-and-after comparison | Identical seeded arrivals and trips, synchronized plan/3D views, barrier/gate controls and inspectable encounters |
| Operational scorecard | Walking distance/time saved or added, forklift waiting, completed/unfinished trips and elapsed completion time when all work finishes |
| Forklift load counters | Simulated loads picked, delivered and remaining, both for the full trial and at the current playback time |

The facility remains loaded beneath analysis. **Back to facility** or **Escape** returns to the previous selection, camera viewpoint, replay time and scroll position. The comparison is an addendum to the facility, not a replacement for its areas or cameras.

## Connected facility concept

The sensor-fusion overlay illustrates **cameras + conveyor PLCs + sensors + Wi-Fi → seeoHub → seeo Fusion → facility digital twin context**. Animated packets show the direction of information flow. Select a source to inspect its sample signal and interface; select seeoHub for edge collection or the separate seeo Fusion node for combined operational context.

The Fusion controls change the **demo**, including source inclusion and simulated dropout. Missing required inputs make the fused context incomplete. The unavailable rear-service camera stays unavailable. These controls do not operate PLCs or send commands to customer equipment.

Network paths and any wireless indicators are logical illustrations, not a surveyed network, RF coverage guarantee or proof that every industrial device uses Wi-Fi. All readings and connections are synthetic. Real source discovery, protocol adapters, data validation and customer connections remain future integrations.

## The digital-twin workflow

The intended solution connects operational observation to a testable change:

1. **Observe:** establish the current layout, traffic and work from calibrated camera observations and operational records.
2. **Test:** run equivalent work through proposed routes, staging positions, barriers and crossing rules.
3. **Implement:** record the selected intervention and the date it changed.
4. **Verify:** compare actual after-change measurements with the baseline and the simulation, accounting for workload and staffing.

**Implemented today:** the fictional facility, replay, camera-style imagery, illustrative sensor-fusion network, deterministic crossing experiment and scheduled trailer-loading workflow. **Future integration:** customer geometry, live seeo observations, operational records and measured after-change validation. This repository is a simulation foundation, not yet a customer-calibrated production twin.

## Quick start with Docker

### Requirements

- Git.
- Docker Desktop on Windows/macOS, or Docker Engine with the Docker Compose v2 plugin on Linux. Docker must be running; use Linux containers on Windows.
- A modern browser. The 3D view needs WebGL; Plan view remains available if 3D cannot initialize.
- Internet access for the first image build and dependency download.

No host Node.js installation or API keys are required for the fictional seeo facility demo. Optional providers used by the original globe are separate.

### 1. Clone the seeo branch

```sh
git clone --branch seeo/facility-scenario-prototype https://github.com/dean-marris/gods-eye-view.git
cd gods-eye-view
```

### 2. Build and start

```sh
docker compose up --build -d
docker compose ps
docker compose logs --tail=80 gods-eye-view
```

On native Linux, if your account is not UID/GID 1000, use this start command so files written through the source mount belong to your account:

```sh
env UID="$(id -u)" GID="$(id -g)" docker compose up --build -d
```

### 3. Open the facility

**Open <http://localhost:4173/seeo-demo.html>.** The root address opens the original globe, so include `seeo-demo.html` for the warehouse experience.

| Address | Purpose |
| --- | --- |
| <http://localhost:4173/seeo-demo.html> | Full seeo facility and integrated analysis — start here |
| <http://localhost:4173/loading-comparison.html?from=local> | Direct trailer-loading comparison |
| <http://localhost:4173/dispatch-comparison.html?from=local> | Direct dispatch comparison, with a return link to the local facility |
| <http://localhost:4173/> | Original God’s Eye View globe |

The container uses the repository’s Node/Vite runtime. Compose mounts the checkout into `/app`, keeps container dependencies in a separate volume, and publishes port 4173 on the host’s loopback interface. It is a local development/demo installation; the public demo URL is a separately published static build.

These instructions build the image from source with `docker compose up --build`; no container-registry image is required.

## Try the solution in five minutes

1. Open the facility, switch between **Plan** and **3D model**, and use **Fit whole site**. Explore the **Sensor fusion** layer: inspect a camera, conveyor PLC, sensor, Wi-Fi node, seeoHub or seeo Fusion. Pause flow or hide the layer to inspect the underlying facility.
2. Select an area or camera. Open its generated image and switch between the seven area images.
3. Explore **Proposed flow**: four distinct forklift circuits with pickup/drop-off dwell, loaded travel and empty returns; people use a protected perimeter connection. It repeats over 200 seconds and starts paused when reduced motion is preferred. Switch to **Original crossing** for the historical 40-second replay, or use **Watch truck dock**.
4. Choose **Test a change**. Explore the productivity graph: switch measures, select a time to seek both scenes, and inspect the proposed layout changes. Then compare the two layouts with shared playback.
5. In **Trailer loading**, change the proposed staging/checker distances, order size or trial window and rerun. Try **Use equal layout** to check parity. In **Dispatch crossing**, change demand, seed or barrier/gate settings and choose **Run comparison**; inspect encounters.
6. Close analysis with **Back to facility** or **Escape**. The original facility and cameras remain available.

## Understand the measurements

### Trailer loading: same order, different layout

The new default analysis schedules the same pallet IDs through two forklifts, one checker and one loading dock. A forklift completes pickup dwell before carrying a pallet; it delivers after dock service and is unavailable for its next job until its empty return finishes. Checker walking, inspection and return are booked serially. Loading service cannot overlap at the single dock.

Default assumptions: 24 pallets, a common 600-second window, forklift speed 3 m/s, walking speed 1.5 m/s, pickup 4 s, inspection 3 s and dock service 5 s. Staging-to-inspection changes from 24 m to 12 m; checker station-to-inspection changes from 12 m to 4 m. Inspection-to-dock remains 6 m.

| Result | Before | Proposed | Difference |
| --- | ---: | ---: | ---: |
| Pallets picked / loaded | 24 / 24 | 24 / 24 | Same work |
| Trailer fully loaded | 8 min 09 s | 5 min 22 s | **2 min 47 s faster (34.1%)** |
| All empty returns complete | 8 min 19 s | 5 min 28 s | 2 min 51 s earlier |
| Checker walking | 576 m | 192 m | **384 m less** |
| Checker walking time | 6 min 24 s | 2 min 08 s | **4 min 16 s saved** |
| Forklift travel | 1,440 m | 864 m | **576 m less** |
| Forklift queue wait, summed | 3 min 31 s | 1 min 12 s | **2 min 19 s less** |

Rounded times come from the schedule, not measured customer operations. Actor time sums across resources and is separate from elapsed trailer completion. Metrics are clipped to the same trial window; unfinished work remains visible and full-order time savings are withheld when either trailer is incomplete. Equal geometry produces equal results; a longer proposed layout can be worse. Dock unused capacity includes the rest of the fixed window after loading finishes, so faster completion does not automatically reduce that measure.

These gains demonstrate **shorter staging and checker routes**, not a productivity benefit attributed to barriers. The loading model uses constant speeds and serialized resources, with schematic visual lane offsets; it does not resolve vehicle collisions, steering or congestion between travel paths.

The productivity graph uses the same schedules as the plan and 3D replay. Loaded pallets advance at delivery events; walking, travel and waiting accumulate over task intervals. Selecting a graph time seeks both scenes. Its layout graphic describes **proposed simulated changes**, not installation evidence. The cursor readout compares both sides at the same time; full-order savings remain separate from progress at that instant.

### Dispatch crossing measurements

| Measure | Meaning in this prototype |
| --- | --- |
| Walking distance | Sum of metres travelled by people, including partial journeys |
| Walking time | Sum of moving time across people; not the elapsed duration of a shift |
| Forklift waiting | Sum of stationary/arrival-queue time across forklifts |
| Completed / unfinished trips | People and forklift trips that reached their destination, and all work still outstanding, including future arrivals |
| Elapsed completion | Time when every original trip finishes; withheld if either run has unfinished work at the trial end |
| Loads picked / delivered / remaining | One assumed pallet per forklift trip: picked at activation and delivered at its destination; queued/future trips have not picked |
| Proximity episodes / exposure | Continuous person–forklift pair episodes below the selected centre-distance threshold, and their summed pair-seconds |
| Mixed crossing occupancy | Wall-clock time with both actor types in the buffered crossing area |

Operational savings use **before minus after**. The scorecard labels lower values as saved, higher values as extra, and equal values as unchanged. More time or distance does not become a positive saving. Completion counts stay visible so a run does not appear efficient just because it leaves work unfinished.

### Crossing example: default normal-demand trial

Seed 42, 120-second window, 3 m centre-distance threshold; proposal uses a channel barrier and fully compliant gate.

| Result | Before | After |
| --- | ---: | ---: |
| People walking distance | 224 m | 448 m |
| People walking time, summed | 173.6 s | 340.8 s |
| Forklift waiting, summed | 103.5 s | 357.2 s |
| Completed trips | 28 of 28 | 28 of 28 |
| Forklift loads picked / delivered | 14 / 14 | 14 / 14 |
| All trips completed at | 73.4 s | 84.3 s |
| Proximity episodes | 6 | 1 |
| Mixed crossing occupancy | 18 s | 0 s |

This example demonstrates a trade-off: reduced simulated crossing exposure with extra walking and waiting. It does **not** establish that a barrier alone improves productivity or that a real site will achieve the same result. Change the assumptions and inspect what happens.

## Scope and limits

- The site, routes, people, vehicles, events, camera positions and images are fictional.
- Camera images are static AI-generated illustrations, not live feeds or synchronized simulation evidence. Camera coverage shapes are illustrative, not detection guarantees.
- The default main facility uses an authored 200-second repeating **Proposed flow**, with protected perimeter pedestrian movement and separate forklift work circuits. It illustrates layout separation, without calculating new savings or certifying safety. **Original crossing** retains the original 40-second event and docking replay. Camera stills and sample events describe original-layout fixtures. The separate dispatch and loading experiments retain their own trajectories and metrics.
- The dispatch comparison defaults to a protected pedestrian bypass around the end of the forklift lanes, with no shared crossing or gate. Both sides use the same seeded workload and 3 m/s forklift speed. The 76 m bypass replaces a 16 m direct walk; scorecards report the extra walking alongside reduced forklift waiting, rather than claiming a net productivity gain. Legacy crossing experiments retain configurable gates, yielding and speed. The engine uses 0.1-second steps, same-lane following and arrival queues, with simplified acceleration and stop-line handling.
- Dispatch 3D actors use live pose properties so forklifts, people and floor geometry remain visible during playback and seeking. Plan and 3D share the route and protective-rail geometry.
- It does not model validated braking distances, full collision/steering physics, forklift load dynamics or crowd avoidance.
- Crossing-mode load counts assume one pallet per trip, without handling dwell or trailer service. Trailer-loading mode separately models pickup, inspection, dock service and empty returns; its capacity, speeds and service times are illustrative assumptions, not calibrated productivity forecasts.
- No injury probabilities, guaranteed savings, annual ROI or measured customer results are claimed.

## Update, stop and verify

Update this checkout and rebuild:

```sh
git pull --ff-only origin seeo/facility-scenario-prototype
docker compose up --build -d
```

Stop without removing the container:

```sh
docker compose stop
```

Restart:

```sh
docker compose up -d
```

Run the seeo behavior tests and build all four browser entry points:

```sh
docker compose exec -T gods-eye-view node --test 'src/seeo-demo/*.test.mjs'
docker compose exec -T gods-eye-view npx vite build --config seeo-demo.vite.config.js
```

The build writes `dist/`. Editing local source or building it does not automatically update the externally hosted demo. For native Node.js setup, troubleshooting, storage, architecture and deployment details, see the [installation and operating guide](docs/seeo-demo.md).

## Source map

| Path | Responsibility |
| --- | --- |
| `seeo-demo.html` | Facility entry, camera/evidence dialogs and integrated analysis container |
| `loading-comparison.html` | Standalone and embedded trailer-loading comparison |
| `dispatch-comparison.html` | Standalone and embedded dispatch comparison |
| `src/seeo-demo/main.js` / `model.js` | Facility interactions, replay integration and Cesium model |
| `src/seeo-demo/facilityFlow.js` | Shared proposed routes, pedestrian/barrier geometry, work tasks and repeating playback |
| `src/seeo-demo/forkliftAssembly.js` | Renderer parts with explicit fork/load visibility roles |
| `src/seeo-demo/fusion.js` / `fusion-view.js` | Simulated source catalog, network paths, packet frames and fused context; Plan/inspector presentation |
| `src/seeo-demo/replay.js` | Authored facility actor and truck-docking replay |
| `src/seeo-demo/loading.js` | Deterministic resource schedule, task milestones and clipped loading metrics |
| `src/seeo-demo/productivity.js` / `productivity-view.js` | Schedule-derived productivity curves, cursor/metric interactions and proposed-layout graphic |
| `src/seeo-demo/loading-main.js` / `loading-scene.js` | Loading UI, paired plan/Cesium views and pallet stock |
| `src/seeo-demo/dispatch.js` | Renderer-independent deterministic crossing simulation |
| `src/seeo-demo/dispatchSummary.js` | Operational summary and forklift-load accounting |
| `src/seeo-demo/dispatch-main.js` / `dispatch-scene.js` | Comparison UI and 3D rendering |
| `src/seeo-demo/assets/` | Seven generated camera-style images |
| `seeo-demo.vite.config.js` | Globe + facility + loading + crossing build entries |
| `Dockerfile` / `compose.yaml` | Local container image and runtime setup |

## Origin and license

This fork retains [bilawalsidhu/gods-eye-view](https://github.com/bilawalsidhu/gods-eye-view), its [MIT license](LICENSE), and the [original README](README.upstream.md). Consult [DATA_SOURCES.md](DATA_SOURCES.md) for upstream data-source terms. The seeo facility and comparison modules are an added demonstration built with Cesium; the original globe remains available.

TEN Leasing branding appears in a labelled synthetic yard illustration. It is illustrative, not evidence of affiliation, endorsement or a customer deployment.
