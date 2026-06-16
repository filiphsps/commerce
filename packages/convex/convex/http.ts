import { httpRouter } from 'convex/server';

import { clerkWebhook } from './clerk/webhooks';

/**
 * The Convex HTTP router for `@nordcom/commerce-convex`, exported as the deployment's `default` so
 * Convex serves the routes below at the deployment's `.convex.site` origin. The only route today is
 * the Clerk webhook sink; additional public HTTP endpoints register here.
 */
const http = httpRouter();

/**
 * `POST /clerk-webhooks` — the svix-verified Clerk webhook sink. Clerk POSTs user/organization/
 * membership events here; {@link clerkWebhook} verifies the signature and projects each event into the
 * Convex mirror tables (`users`/`orgs`/`orgMemberships`) and the `shopCollaborators` fan-out. The
 * matching endpoint URL is registered on the Clerk instance (config-as-code / dashboard).
 */
http.route({
    path: '/clerk-webhooks',
    method: 'POST',
    handler: clerkWebhook,
});

export default http;
