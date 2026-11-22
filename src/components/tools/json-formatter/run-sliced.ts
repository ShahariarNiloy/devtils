/**
 * Cooperative scheduler for the generators in `json-sliced.lib.ts`: runs
 * steps for up to `budgetMs`, then yields to the event loop (a MessageChannel
 * hop — no 4 ms setTimeout clamp) so input and paint get through. A long
 * whole-document pass becomes many sub-frame tasks.
 */

export interface SlicedJob<T> {
  promise: Promise<T>;
  /** Stop at the next pause point; the promise then never settles. */
  cancel: () => void;
}

export function runSliced<T>(steps: Iterator<void, T>, budgetMs = 8): SlicedJob<T> {
  let cancelled = false;
  const promise = new Promise<T>((resolve, reject) => {
    const channel = new MessageChannel();
    const slice = () => {
      if (cancelled) {
        channel.port1.close();
        return;
      }
      const start = performance.now();
      try {
        for (;;) {
          const r = steps.next();
          if (r.done) {
            channel.port1.close();
            resolve(r.value);
            return;
          }
          if (performance.now() - start >= budgetMs) break;
        }
      } catch (err) {
        channel.port1.close();
        reject(err);
        return;
      }
      channel.port2.postMessage(null);
    };
    channel.port1.onmessage = slice;
    slice();
  });
  return {
    promise,
    cancel: () => {
      cancelled = true;
    },
  };
}
