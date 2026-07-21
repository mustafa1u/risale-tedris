import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createSearchQueryScheduler } from "./searchQueryScheduler.js";

function makeTimerHarness() {
  const callbacks = new Map();
  let nextId = 1;
  return {
    callbacks,
    setTimer(callback) {
      const id = nextId++;
      callbacks.set(id, callback);
      return id;
    },
    clearTimer(id) {
      callbacks.delete(id);
    },
    flush() {
      for (const [id, callback] of [...callbacks]) {
        callbacks.delete(id);
        callback();
      }
    }
  };
}

describe("search query scheduler", () => {
  it("debounces typing and executes only the latest query", () => {
    const timer = makeTimerHarness();
    const runs = [];
    const scheduler = createSearchQueryScheduler({
      run: (request) => runs.push(request.query),
      setTimer: timer.setTimer,
      clearTimer: timer.clearTimer
    });

    scheduler.schedule({ query: "i" });
    scheduler.schedule({ query: "iman" });
    assert.deepEqual(runs, []);
    assert.equal(timer.callbacks.size, 1);
    timer.flush();
    assert.deepEqual(runs, ["iman"]);
  });

  it("executes Enter and clear/reset immediately while cancelling pending input", () => {
    const timer = makeTimerHarness();
    const runs = [];
    const scheduler = createSearchQueryScheduler({
      run: (request) => runs.push(request.query),
      setTimer: timer.setTimer,
      clearTimer: timer.clearTimer
    });

    scheduler.schedule({ query: "bekleyen" });
    scheduler.submit({ query: "hemen" });
    assert.deepEqual(runs, ["hemen"]);
    assert.equal(timer.callbacks.size, 0);

    scheduler.schedule({ query: "silinecek" });
    scheduler.clear({ scopes: ["text"] });
    assert.deepEqual(runs, ["hemen", ""]);
    assert.equal(timer.callbacks.size, 0);

    scheduler.schedule({ query: "" });
    assert.deepEqual(runs, ["hemen", "", ""]);
  });
});
