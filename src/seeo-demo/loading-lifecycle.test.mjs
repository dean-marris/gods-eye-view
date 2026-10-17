import test from "node:test";
import assert from "node:assert/strict";
import { registerLoadingLifecycle } from "./loading-lifecycle.js";

const navigation = (type, persisted) => {
  const event = new Event(type);
  Object.defineProperty(event, "persisted", { value: persisted });
  return event;
};
test("history-cache navigation retains replay resources and refreshes the playback clock on restoration", () => {
  const page = new EventTarget();
  let resources = "active",
    restores = 0;
  registerLoadingLifecycle(page, {
    release: () => {
      resources = "released";
    },
    restore: () => {
      restores++;
    },
  });
  page.dispatchEvent(navigation("pagehide", true));
  assert.equal(resources, "active");
  page.dispatchEvent(navigation("pageshow", true));
  assert.equal(resources, "active");
  assert.equal(restores, 1);
  page.dispatchEvent(navigation("pagehide", false));
  assert.equal(resources, "released");
});
test("initial page display does not invoke the history restoration callback", () => {
  const page = new EventTarget();
  let restores = 0;
  registerLoadingLifecycle(page, {
    release() {},
    restore: () => {
      restores++;
    },
  });
  page.dispatchEvent(navigation("pageshow", false));
  assert.equal(restores, 0);
});
