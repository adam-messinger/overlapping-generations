/**
 * Task execution strategy for the experiment and ensemble layers.
 *
 * The core stays synchronous and single-threaded: it has no Node built-ins and
 * runs in browsers, so it cannot own a worker pool. Instead the parallel
 * entry points accept an executor and the concurrency lives outside — see the
 * `tsimulation/parallel` subpath for a `worker_threads` implementation.
 *
 * Two properties every implementation must hold, because the callers depend on
 * them for reproducibility:
 *
 * - Results are returned in INPUT order, never completion order.
 * - Every task is run exactly once.
 *
 * Seeded draws are generated on the calling thread before any task starts, so
 * a seeded parallel run and a seeded serial run of the same study produce
 * identical output. An executor that reorders results would break that; the
 * ordering test in `executor.test.ts` pins it.
 */
export interface TaskExecutor {
  map<TIn, TOut>(
    items: readonly TIn[],
    run: (item: TIn, index: number) => TOut | Promise<TOut>,
  ): Promise<TOut[]>;
}

/**
 * The default: run every task on the calling thread, in order.
 *
 * Used whenever a parallel entry point is called without an executor, so the
 * serial and parallel paths differ only in how the task list is mapped — not
 * in how the study is set up or how its results are aggregated.
 */
export const serialExecutor: TaskExecutor = {
  async map(items, run) {
    const results = [];
    for (let index = 0; index < items.length; index++) {
      results.push(await run(items[index], index));
    }
    return results;
  },
};
