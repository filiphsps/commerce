import type { CartMiddleware } from '../compose';

/**
 * Built-in middleware that retries transport / provider failures with
 * linear backoff. Errors matched by `name` to `CartUserError`,
 * `CartNotFoundError`, and `CartCapabilityUnsupportedError` propagate
 * immediately — they are deterministic and a retry would never resolve
 * them. All other errors retry up to `attempts` times; on final failure
 * the last error is rethrown.
 *
 * @param opts.attempts - Total attempts including the initial call (`>= 1`).
 * @param opts.backoffMs - Multiplier for linear backoff between attempts; set
 *   to `0` to disable sleeps (useful in tests).
 * @returns A {@link CartMiddleware} that retries retryable failures.
 */
export function retry(opts: { attempts: number; backoffMs: number }): CartMiddleware {
    return (next) => async (mutation, ctx) => {
        let lastError: unknown;
        for (let i = 0; i < opts.attempts; i++) {
            try {
                return await next(mutation, ctx);
            } catch (error) {
                const name = (error as Error)?.name;
                if (
                    name === 'CartUserError' ||
                    name === 'CartNotFoundError' ||
                    name === 'CartCapabilityUnsupportedError'
                ) {
                    throw error;
                }
                lastError = error;
                if (i < opts.attempts - 1 && opts.backoffMs > 0) {
                    await new Promise((r) => setTimeout(r, opts.backoffMs * (i + 1)));
                }
            }
        }
        throw lastError;
    };
}
