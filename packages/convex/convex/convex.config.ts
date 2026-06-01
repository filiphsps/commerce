import actionRetrier from '@convex-dev/action-retrier/convex.config.js';
import { defineApp } from 'convex/server';

/**
 * Convex component registration for `@nordcom/commerce-convex`. Components are installed sub-deployments
 * with their own tables, functions, and schedulers; registering them here is what makes their generated
 * API surface available on `components.*` in `_generated/api`.
 *
 * `actionRetrier` (`@convex-dev/action-retrier`) backs the durable revalidation-delivery layer
 * (BRIDGE-07): it re-executes the `revalidate/notify` action under bounded exponential backoff and
 * invokes an `onComplete` callback exactly once when a run terminates, which the delivery layer uses to
 * dead-letter and alert on retry exhaustion. Its retry bookkeeping lives in the component's OWN tables,
 * kept off this package's schema.
 */
const app = defineApp();
app.use(actionRetrier);

export default app;
