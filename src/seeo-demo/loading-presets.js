import { BASELINE_LAYOUT, PROPOSED_LAYOUT } from './loading.js';

// Both preset actions use the same rerun path as a manually edited layout.
export function registerLoadingPresets({form, equal, proposed, rerun}) {
  for (const [button, layout] of [[equal, BASELINE_LAYOUT], [proposed, PROPOSED_LAYOUT]]) {
    button.addEventListener('click', () => {
      form.elements.staging.value = String(layout.staging);
      form.elements.checker.value = String(layout.checker);
      rerun();
    });
  }
}
