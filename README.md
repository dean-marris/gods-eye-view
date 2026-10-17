# seeo Facility Intelligence

**Explore a facility. Test a workflow change. See the effect on movement, waiting and completed work.**

A browser-based warehouse and distribution-centre demonstration built on [God’s Eye View](https://github.com/bilawalsidhu/gods-eye-view) and Cesium. It combines a complete plan/3D facility, camera context, moving people and vehicles, and an integrated before-and-after dispatch simulation.

[Open the live demo](https://seeo-facility-demo.dean501646.chatgpt.site/) · [Installation and operating guide](docs/seeo-demo.md) · [Original God’s Eye View README](README.upstream.md)

> **Use branch `seeo/facility-scenario-prototype`.** The seeo implementation is on this branch; `main` retains the upstream project. This is a fictional simulation prototype, with no customer footage, production seeo connection or measured customer outcomes.

## What the solution does

The demonstration helps operations and health-and-safety teams examine a proposed change in context: where people walk, where forklifts wait, how much work completes, and where traffic interacts.

| Capability | What you can explore |
| --- | --- |
| Whole-facility plan and 3D model | Receiving, storage aisles, rear service area, packing cells, dispatch crossing, dispatch bays and truck yard |
| Camera context | Selectable camera markers and seven distinct AI-generated, static area images |
| Recognizable activity | Four forklifts, seven people and an articulated truck reversing into Bay 1 in the facility replay |
| Scenario playback | Busy shift, aisle traffic, dispatch staging and packing activity; play, pause, restart and seek |
| Integrated dispatch experiment | Open analysis inside the facility through **Test a change**, **Review a change**, or the dispatch-area action |
| Before-and-after comparison | Identical seeded arrivals and trips, synchronized plan/3D views, barrier/gate controls and inspectable encounters |
| Operational scorecard | Walking distance/time saved or added, forklift waiting, completed/unfinished trips and elapsed completion time when all work finishes |
| Forklift load counters | Simulated loads picked, delivered and remaining, both for the full trial and at the current playback time |

The facility remains loaded beneath analysis. **Back to facility** or **Escape** returns to the previous selection, camera viewpoint, replay time and scroll position. The comparison is an addendum to the facility, not a replacement for its areas or cameras.

## The digital-twin workflow

The intended solution connects operational observation to a testable change:

1. **Observe:** establish the current layout, traffic and work from calibrated camera observations and operational records.
2. **Test:** run equivalent work through proposed routes, staging positions, barriers and crossing rules.
3. **Implement:** record the selected intervention and the date it changed.
4. **Verify:** compare actual after-change measurements with the baseline and the simulation, accounting for workload and staffing.

**Implemented today:** the fictional facility, replay, camera-style imagery and deterministic dispatch experiment. **Future integration:** customer geometry, live seeo observations, operational records and measured after-change validation. This repository is a simulation foundation, not yet a customer-calibrated production twin.

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
| <http://localhost:4173/dispatch-comparison.html?from=local> | Direct dispatch comparison, with a return link to the local facility |
| <http://localhost:4173/> | Original God’s Eye View globe |

The container uses the repository’s Node/Vite runtime. Compose mounts the checkout into `/app`, keeps container dependencies in a separate volume, and publishes port 4173 on the host’s loopback interface. It is a local development/demo installation; the public demo URL is a separately published static build.

These instructions build the image from source with `docker compose up --build`; no container-registry image is required.

## Try the solution in five minutes

1. Open the facility, switch between **Plan** and **3D model**, and use **Fit whole site**.
2. Select an area or camera. Open its generated image and switch between the seven area images.
3. Start **Busy shift**, try the other facility scenarios, or use **Watch truck dock**.
4. Choose **Test a change**. Read the operational scorecard, then compare the two layouts with shared playback.
5. Change demand, seed, proximity threshold or proposal settings; choose **Run comparison** to apply them. Use the encounter list to inspect an actual simulated interaction.
6. Close analysis with **Back to facility** or **Escape**. The original facility and cameras remain available.

## Understand the measurements

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

### Example: default normal-demand trial

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
- The facility’s 40-second replay follows authored routes. Its historical fixture events do not change when a barrier is drawn. The separate dispatch experiment calculates its own trajectories and metrics.
- The dispatch engine uses a single seeded workload and 0.1-second steps. It includes route changes, yielding, gate phases and same-lane queues, with simplified acceleration and stop-line handling.
- It does not model validated braking distances, full collision/steering physics, forklift load dynamics or crowd avoidance.
- Pickup/delivery counts do not include handling dwell, trailer-loading service times or a complete return-cycle model. Do not interpret them as measured loading productivity or pallets-per-hour forecasts.
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

Run the seeo behavior tests and build all three browser entry points:

```sh
docker compose exec -T gods-eye-view node --test 'src/seeo-demo/*.test.mjs'
docker compose exec -T gods-eye-view npx vite build --config seeo-demo.vite.config.js
```

The build writes `dist/`. Editing local source or building it does not automatically update the externally hosted demo. For native Node.js setup, troubleshooting, storage, architecture and deployment details, see the [installation and operating guide](docs/seeo-demo.md).

## Source map

| Path | Responsibility |
| --- | --- |
| `seeo-demo.html` | Facility entry, camera/evidence dialogs and integrated analysis container |
| `dispatch-comparison.html` | Standalone and embedded dispatch comparison |
| `src/seeo-demo/main.js` / `model.js` | Facility interactions, replay integration and Cesium model |
| `src/seeo-demo/replay.js` | Authored facility actor and truck-docking replay |
| `src/seeo-demo/dispatch.js` | Renderer-independent deterministic crossing simulation |
| `src/seeo-demo/dispatchSummary.js` | Operational summary and forklift-load accounting |
| `src/seeo-demo/dispatch-main.js` / `dispatch-scene.js` | Comparison UI and 3D rendering |
| `src/seeo-demo/assets/` | Seven generated camera-style images |
| `seeo-demo.vite.config.js` | Globe + facility + comparison build entries |
| `Dockerfile` / `compose.yaml` | Local container image and runtime setup |

## Origin and license

This fork retains [bilawalsidhu/gods-eye-view](https://github.com/bilawalsidhu/gods-eye-view), its [MIT license](LICENSE), and the [original README](README.upstream.md). Consult [DATA_SOURCES.md](DATA_SOURCES.md) for upstream data-source terms. The seeo facility and comparison modules are an added demonstration built with Cesium; the original globe remains available.

TEN Leasing branding appears in a labelled synthetic yard illustration. It is illustrative, not evidence of affiliation, endorsement or a customer deployment.
