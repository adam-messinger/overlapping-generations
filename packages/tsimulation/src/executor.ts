/**
 * Task execution strategy for the ensemble layer.
 *
 * The experiment layer's study loops are equally parallelisable and do not
 * take an executor yet.
 *
 * The core is synchronous, single-threaded and free of Node built-ins, so it
 * cannot own a worker pool. Concurrency is injected instead.
 *
 * Two invariants matter, and the framework enforces both rather than trusting
 * them: every task runs exactly once, and results are matched to their input
 * by index rather than by arrival. That is why `map` returns index/result
 * pairs — an executor that finishes out of order returns what it has, and the
 * caller reassembles. An executor that drops, duplicates or invents a task is
 * rejected with a clear error instead of producing a confidently wrong result.
 *
 * Errors are fail-fast: the first rejection propagates and the rest are
 * abandoned.
 */
export interface TaskResult<TOut> {
  /** Index into the input array. */
  index: number;
  result: TOut;
}

/**
 * A serializable handle to the work, for executors that run out of process.
 *
 * A closure cannot cross a thread boundary, so an in-process executor and a
 * worker pool cannot be handed the same thing. `TaskSpec` carries both: `run`
 * for in-process execution, `ref` naming a module an out-of-process executor
 * can import. A pool given no `ref` must fail loudly rather than quietly
 * computing something other than `run`.
 */
export interface TaskRef {
  /** Module specifier the worker imports. */
  module: string;
  /** Named export within `module`. */
  export?: string;
  /** Structured-cloneable setup passed to that export once per worker. */
  setup?: unknown;
}

export interface TaskSpec<TIn, TOut> {
  /** In-process path. An out-of-process executor must not call this. */
  run: (item: TIn, index: number) => TOut | Promise<TOut>;
  /** Out-of-process path. Items and results must be structured-cloneable. */
  ref?: TaskRef;
}

export interface TaskExecutor {
  map<TIn, TOut>(
    items: readonly TIn[],
    task: TaskSpec<TIn, TOut>,
  ): Promise<ReadonlyArray<TaskResult<TOut>>>;
}

/**
 * The default: run every task on the calling thread, in order.
 *
 * Used whenever a parallel entry point is called without an executor, so the
 * serial and parallel paths differ only in how the task list is mapped — not
 * in how the study is set up or how its results are aggregated.
 */
export const serialExecutor: TaskExecutor = {
  async map(items, task) {
    const results = [];
    for (let index = 0; index < items.length; index++) {
      results.push({ index, result: await task.run(items[index], index) });
    }
    return results;
  },
};

/**
 * Scatter an executor's pairs back into input order, rejecting any executor
 * that did not run each task exactly once.
 *
 * Without this the invariants are documentation: an executor that returns one
 * result short, or the same result twice, yields a plausible-looking summary
 * over the wrong number of draws.
 */
export function orderTaskResults<TOut>(
  pairs: ReadonlyArray<TaskResult<TOut>>,
  expected: number,
  context: string,
): TOut[] {
  if (pairs.length !== expected) {
    throw new Error(
      `${context}: executor returned ${pairs.length} results for ${expected} tasks`,
    );
  }
  const ordered = new Array<TOut>(expected);
  const seen = new Set<number>();
  for (const { index, result } of pairs) {
    if (!Number.isInteger(index) || index < 0 || index >= expected) {
      throw new Error(`${context}: executor returned out-of-range index ${index}`);
    }
    if (seen.has(index)) {
      throw new Error(`${context}: executor returned index ${index} more than once`);
    }
    seen.add(index);
    ordered[index] = result;
  }
  return ordered;
}
