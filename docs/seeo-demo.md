# seeo installation and operating guide

Start with the [solution overview and Docker quick start](../README.md). This guide covers installation details, day-to-day operation, verification and the boundaries of the demo.

## Choose how to run it

| Option | Use it for | Installation |
| --- | --- | --- |
| [Public demo](https://seeo-facility-demo.dean501646.chatgpt.site/) | Sharing and exploring the fictional facility | None; open in a browser |
| Docker Compose | Local development/demo with consistent container dependencies | Git, Docker and Compose v2 |
| Native Node.js | Developers who want to work directly with the source | Git, a supported Node.js version and npm |

Use branch **`seeo/facility-scenario-prototype`**. The repository’s default `main` branch remains the original globe.

## Docker installation

### Prerequisites

Confirm the tools are available and the Docker engine is running:

```sh
git --version
docker version
docker compose version
```

On Windows/macOS, start Docker Desktop first. On Windows, select Linux containers. On Linux, the current account must be allowed to use the Docker engine. A first build needs network access to download its base image and dependencies.

### Clone and start

```sh
git clone --branch seeo/facility-scenario-prototype https://github.com/dean-marris/gods-eye-view.git
cd gods-eye-view
docker compose up --build -d
docker compose ps
docker compose logs --tail=80 gods-eye-view
```

On native Linux, use your account’s UID/GID when starting if they differ from 1000:

```sh
env UID="$(id -u)" GID="$(id -g)" docker compose up --build -d
```

Wait for the log to report `Ready at http://localhost:4173/`, then open:

**<http://localhost:4173/seeo-demo.html>**

The root URL `/` opens the original globe. Direct analysis entries are `/loading-comparison.html?from=local` and `/dispatch-comparison.html?from=local`; their normal entry is inside the full facility.

### What Docker runs

- `Dockerfile` installs the project’s Node/npm dependencies and copies the source into an image. It runs as a non-root user.
- `compose.yaml` builds that image locally, mounts the checkout at `/app` for development, and gives `/app/node_modules` a separate container volume.
- The startup script runs Vite and the original globe’s API middleware. It is a development/demo server, not a separate Nginx production image.
- Port 4173 is published on `127.0.0.1`, so the browser on that machine can reach it. A remote server’s `localhost` is not your laptop’s `localhost`.
- The seeo facility requires no provider API keys. Optional globe/provider settings are described in the [upstream README](../README.upstream.md).

The documented installation builds from the repository with Compose and does not require a Docker Hub or GHCR image tag.

### Everyday commands

From the checkout directory:

```sh
# Status and recent logs
docker compose ps
docker compose logs --tail=100 gods-eye-view

# Stop / start
docker compose stop
docker compose up -d

# Update source and rebuild
git pull --ff-only origin seeo/facility-scenario-prototype
docker compose up --build -d
```

On Linux, keep using the UID/GID start variant if your installation needs it. If `git pull --ff-only` stops because of local edits or divergent history, preserve and review those changes before reconciling them.

## Native development without Docker

Use a Node.js version allowed by `package.json`: Node **24.14 or newer within 24.x**, or **26.x**. The container pins its own version; a host Node installation is unnecessary for Docker users.

In a POSIX shell, from the cloned seeo branch:

```sh
PUPPETEER_SKIP_DOWNLOAD=1 npm ci
npm run dev -- --host 127.0.0.1 --port 4173
```

Open <http://localhost:4173/seeo-demo.html>. `PUPPETEER_SKIP_DOWNLOAD=1` skips the browser download used by upstream QA scripts; it is not needed for the facility itself. These shell environment commands are for Linux/macOS/WSL; Docker is the shared path documented above for Windows PowerShell users.

## Sensor fusion layer

The full facility offers an additive connection layer in both Plan and 3D. Representative cameras, conveyor PLCs and sensors feed an illustrative Wi-Fi/site-network layer and central seeo Fusion hub. Packet animation shows information flowing inward; it is independent of the physical replay. Pause flow, hide the layer, select a source, or use the accessible source list to inspect it.

Source readings and an example fused operational context follow fictional replay data. Demo inclusion controls can exclude and restore available inputs; missing required inputs make the combined context incomplete. C04 remains unavailable. Interface names and wireless paths are illustrative; no network discovery, actual PLC connection, real Wi-Fi coverage measurement or remote equipment control is implemented.

The full facility, generated camera images and workflow/productivity analyses remain available. Layer animation honors reduced-motion preferences and stops while hidden or covered by a dialog.

## Using the facility and comparison

The whole facility remains the main experience. Explore the plan/3D model, select an area or camera, inspect the generated images, or replay the busy shift and truck docking.

**Test a change**, **Review a change**, and the selected dispatch-area action open an analysis dialog while keeping the facility mounted. **Trailer loading** is the default mode; **Dispatch crossing** retains the existing barrier/gate experiment. In 3D, loading focuses the dispatch bays and crossing focuses the crossing. Back to facility or Escape restores the saved camera pose, area, replay time, scroll and focus. The camera image in the dialog is static context; the paired scenes render calculated task frames.

### Trailer loading

The same pallet order passes through two forklifts, one checker and one dock on both sides. Each job has pickup dwell, loaded travel, checker walk/inspection, dock travel and loading service, then an empty return before the forklift can pick again. Stock, carried pallets and trailer inventory conserve the order. The trailer is parked in this experiment; the original facility still has the separate reversing-truck replay.

Change order size, common trial window or proposed staging/checker distances, then rerun. Use **Equal layout** to reproduce the baseline. Longer distances can make the proposal worse. Shared playback, seek, rate, reset, delivery event buttons and Plan/3D work on both sides. Forklift status identifies loaded and empty stages. Large orders display illustrative stacked trailer inventory, not a validated trailer capacity/load plan.

The default 24-pallet example loads the trailer in 489 s before versus 322.3 s proposed: about 2 min 47 s faster (34.1%). Checker walking falls from 576 m to 192 m and 384 s to 128 s. Forklift travel falls from 1,440 m to 864 m; total forklift queue wait falls from 211 s to 72.3 s. These are simulated outcomes of shorter routes with unchanged staffing and service times.

The interactive productivity lens plots both schedules on shared time and metric axes. Select loaded pallets, checker walking, forklift travel or queue wait; graph selection seeks the shared replay, and playback moves its cursor. The implementation graphic shows the applied proposed staging/checker distances and selects related measures. Use the proposed-completion milestone to inspect progress at the same elapsed time, while retaining backlog and censoring in short trials. Unapplied form edits leave the graph on the previous applied trial until rerun. The layout graphic is not proof that a real intervention has been installed.

### Dispatch crossing

This mode uses the same seeded arrivals/trips on both sides. Change proposal controls, then select **Run comparison**; edited but unapplied settings do not change the displayed trial. Shared playback and encounter selection seek both sides together.

The full-trial scorecard is separate from live counters. The default crossing trial delivers 14 assumed loads on each side; at 20 seconds its live counters show 6 picked, 1 delivered and 13 remaining on each side. Here one forklift trip assumes one pallet, picked at activation and delivered at the destination; this simpler counting rule belongs to crossing mode only.

### Interpret work and savings correctly

- Trailer completion means the last pallet is loaded; all-empty-returns completion is a separate metric. A forklift still returning is unavailable for another job even after trailer loading finishes.
- Walking and waiting figures sum time across actors. They are not elapsed shift time or staffing savings. Queue waiting includes time awaiting checker travel and service availability.
- Distances and time are clipped to the shared observation window. Remaining work includes every undelivered original pallet/trip. Full-order completion savings are withheld when either run is incomplete.
- Operational savings use before minus after. Negative and unchanged outcomes remain visible; an inferior proposal does not become a positive saving.
- Dock unused capacity is window duration minus occupied loading-service time, including time after an order finishes. It is not the time until the trailer completes.
- The loading schedule uses constant speeds and resource availability, with schematic display offsets for readability; it does not calculate collision avoidance or travel-path congestion.
- Crossing proximity and shared occupancy are geometric indicators, not measured safety outcomes or injury probabilities. The default barrier/gate reduces shared crossing occupancy while adding walking and waiting. The new loading layout is a separate intervention demonstrating shorter routes.

See the [README measurement definitions and examples](../README.md#understand-the-measurements) for assumptions and results. Neither mode is connected to customer data.

## Tests and build

Run the scoped seeo tests inside Docker:

```sh
docker compose exec -T gods-eye-view node --test 'src/seeo-demo/*.test.mjs'
```

Build the original globe, seeo facility and both comparisons together:

```sh
docker compose exec -T gods-eye-view npx vite build --config seeo-demo.vite.config.js
```

For native development, use the same Node and Vite commands without `docker compose exec -T gods-eye-view`.

The explicit `seeo-demo.vite.config.js` matters: the upstream default `npm run build` is aimed at the globe. The seeo configuration emits all four HTML entry points into `dist/`.

Tests cover deterministic workload parity, baseline invariance, crossing/gate behavior, exposure and distance accounting, unfinished work, signed savings, load milestones, replay/truck motion, selection and framing helpers. Loading tests also cover independent single-pallet accounting, resource non-overlap, pickup/delivery/return milestones, equal and worse layouts, conservation, partial windows and invalid inputs. Productivity graph tests cover exact delivery steps, clipped interval curves, signed benefits, shared domains and censored completion. Fusion tests cover shared availability, explicit picks, source-network-hub endpoints, deterministic finite packet positions and camera/PLC/sensor dropout contributions. The latest feature verification passed 44 tests; this is the seeo suite, not a claim that every upstream QA workflow was run.

## Storage, secrets and portability

Choose the checkout’s location when cloning; the Compose source mount follows it. There is no requirement for an 8 TB drive.

Dean’s running installation uses `/data/gods-eye-view` with a local, untracked `compose.override.yaml` that places dependencies under `/data/gods-eye-view-runtime/node_modules`. That override is specific to his machine and is not needed by a fresh clone. Do not copy its UID or disk paths onto another computer without adapting them.

Docker excludes local environment files, dependencies, build output and caches from the image build context using `.dockerignore`. Compose still mounts the working checkout at runtime. Keep provider secrets in local environment files; do not commit them or expose the development server as an unauthenticated public backend.

## Hosting and the public demo

The [public demo](https://seeo-facility-demo.dean501646.chatgpt.site/) is a separately published static facility build. It does not run inside Dean’s local Docker container, and local edits or a GitHub push do not automatically deploy it.

The standalone hosted source/publication workflow is separate from this fork. Its static entry uses `index.html` for the facility; this full repository uses `seeo-demo.html` because `index.html` belongs to the original globe. Do not overwrite the globe entry when integrating the facility.

The compiled seeo pages and their assets can be hosted statically. The original globe’s provider/API middleware still needs its server runtime. This repository does not supply a dedicated production-only facility image, live customer backend, authentication or tenant isolation for a production seeo service.

## Troubleshooting

| Symptom | Check / action |
| --- | --- |
| Docker cannot connect to the engine | Start Docker Desktop/service and confirm `docker version` shows server information. |
| `docker compose` is unavailable | Install/enable the Compose v2 plugin or Docker Desktop; use the two-word command shown here. |
| The globe opens instead of the warehouse | Open `/seeo-demo.html`, not `/`. |
| Facility page is missing | Confirm `git branch --show-current` reports `seeo/facility-scenario-prototype`, pull that branch and rebuild. |
| Port 4173 is already allocated | Stop the conflicting service or change the host side of the mapping in `compose.yaml` to `127.0.0.1:4174:4173`, then start Compose and browse port 4174. |
| Source/cache permission errors on Linux | Ensure the checkout belongs to your account and start with the documented UID/GID variant. Avoid making a root-owned clone. |
| First build appears slow | Check build output; the initial base image and dependency downloads require network access. Run `docker compose build` in the foreground to see build progress. |
| 3D fails or is blank | Use Plan view; check browser WebGL/hardware acceleration and the browser console. The synthetic camera images are separate from 3D rendering. |
| Analysis settings seem unchanged | Select **Run comparison** after editing controls. |
| The proposal shows extra time or distance | That is a valid modeled trade-off. Check the baseline, demand, completion counts and intervention assumptions. |
| A changed local build does not appear on the public site | Local Docker, GitHub source and public-site publication are separate steps. |

## Architecture and next steps

The facility replay, crossing experiment, loading schedule and renderers are separate modules. Crossing runs at fixed 0.1-second steps; loading schedules task/resource intervals and interpolates their positions independently of render rate. Metrics come from those trajectories or task intervals. Seven generated images provide illustrative context and do not change with replay time.

See the [source map](../README.md#source-map), [facility brief](seeo-facility-scenario.md), [replay brief](seeo-replay-brief.md) and [upstream documentation](../README.upstream.md).

The loading expansion now includes pickup/handling dwell, dock service, complete return cycles and order conservation. Future work includes calibrated trailer capacity and loading constraints, congestion/steering physics, customer geometry and cameras, operational records, observed baseline/after periods and validation of predictions against measured results. Customer calibration and live seeo ingestion remain future integrations.
