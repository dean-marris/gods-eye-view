# seeo facility intelligence demo

[Open the public demo](https://seeo-facility-demo.dean501646.chatgpt.site/).

This fork contains an experimental seeo warehouse and distribution-centre scenario built with Cesium. The site, workers, vehicles, policies, sample events and camera imagery are fictional. It does not connect to customer cameras, seeo services or operational data.

## Explore the local demo

Run the existing Docker Compose setup, then open `http://127.0.0.1:4173/seeo-demo.html`. The original God's Eye View globe remains at `/`.

The scenario includes a warehouse and truck yard, four forklifts, seven people, an articulated truck reverse-docking animation, selectable areas and cameras, seven synthetic camera-style images and sample event review. Camera images are static generated illustrations, not footage or exact reconstructions of model geometry. Camera coverage is illustrative; unavailable monitoring remains unknown.

Choose **Test a change** to open `dispatch-comparison.html`: paired plan/3D scenes run an identical seeded workload through the baseline and proposed crossing. Barriers redirect people, gate rules create queues, and trajectories determine proximity episodes, exposure, waiting, completed jobs, backlog and distance. The shared timeline and encounter buttons support inspection of both runs.

The original facility barrier remains a layout illustration; its historical fixture events do not change. The separate comparison is a hypothetical crossing model with visible assumptions, including simplified braking and no collision physics. Its outputs are not validated injury or incident predictions.

## Source and verification

- Demo entry: `seeo-demo.html`.
- Calculated comparison: `dispatch-comparison.html`; engine `src/seeo-demo/dispatch.js`.
- Facility, replay, imagery and selection: `src/seeo-demo/`.
- Build entry configuration: `seeo-demo.vite.config.js`.
- Original implementation briefs: `docs/seeo-facility-scenario.md` and `docs/seeo-replay-brief.md`.

Run behavior tests inside the Docker service:

```sh
docker compose exec -T gods-eye-view node --test 'src/seeo-demo/*.test.mjs'
```

Build the demo and globe with:

```sh
docker compose exec -T gods-eye-view npx vite build --config seeo-demo.vite.config.js
```

The hosted site is a standalone static snapshot with its own publication workflow. Editing local files does not automatically update the public site. The local 8 TB storage override is machine-specific; adjust bind mounts for another workstation. Keep provider credentials in local environment files and never commit them.

The upstream God's Eye View project and MIT license are retained. TEN Leasing branding appears in a clearly labelled generated yard illustration at the owner's request; it is not evidence of a customer deployment or affiliation.
