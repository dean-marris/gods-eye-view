// Cached history documents resume their existing RAF, observer and WebGL scenes.
// Only a real unload owns final resource release.
export function registerLoadingLifecycle(page, { release, restore }) {
  page.addEventListener("pagehide", (event) => {
    if (!event.persisted) release();
  });
  page.addEventListener("pageshow", (event) => {
    if (event.persisted) restore();
  });
}
