export function createSearchQueryScheduler({
  run,
  delayMs = 200,
  setTimer = globalThis.setTimeout,
  clearTimer = globalThis.clearTimeout
}) {
  let timerId = null;
  let disposed = false;

  function cancel() {
    if (timerId === null) return;
    clearTimer(timerId);
    timerId = null;
  }

  function execute(request) {
    if (disposed) return undefined;
    cancel();
    return run(request);
  }

  function schedule(request) {
    if (disposed) return;
    cancel();
    if (request.query === "") {
      execute(request);
      return;
    }
    timerId = setTimer(() => {
      timerId = null;
      if (!disposed) run(request);
    }, delayMs);
  }

  return {
    schedule,
    submit: execute,
    clear: (request = {}) => execute({ ...request, query: "" }),
    dispose() {
      disposed = true;
      cancel();
    }
  };
}
