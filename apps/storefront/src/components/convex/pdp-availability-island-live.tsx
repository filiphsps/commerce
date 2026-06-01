'use client';

import { ConvexProvider, ConvexReactClient, useQuery } from 'convex/react';
import type { FunctionReference } from 'convex/server';
import { useEffect, useState } from 'react';

/**
 * Public Convex query reference for a product's advisory live availability
 * count, keyed by Shopify product id.
 *
 * Typed precisely (no `any`) so the island stays wireable to a real Convex query
 * the moment one lands, without inventing a fake backend. Per spec §2.5 Shopify
 * remains the system of record for inventory; this number is **advisory UI only**
 * and the buy action re-validates against Shopify at mutation time.
 */
export type AvailabilityQuery = FunctionReference<'query', 'public', { productId: string }, number | null>;

/**
 * Props shared by the live subscriber and the
 * {@link import('./pdp-availability-island').PdpAvailabilityIsland} wrapper that
 * mounts it.
 */
export type PdpLiveAvailabilityProps = {
    query: AvailabilityQuery;
    productId: string;
};

/**
 * Reactive leaf that subscribes to the advisory live availability count over the
 * Convex WebSocket via {@link useQuery}.
 *
 * It is rendered only after the wrapper has mounted it in response to an explicit
 * interaction, so the subscription — and therefore the socket — opens lazily and
 * never on the anonymous/crawler render. While the snapshot warms up (or the
 * per-surface kill switch downgrades the island) `useQuery` returns
 * `undefined`/`null` and this leaf renders nothing, leaving the already-painted
 * crawlable snapshot in place (the explicit degraded contract, spec §2.3) rather
 * than a spinner.
 *
 * @param props.query - The public Convex availability query reference.
 * @param props.productId - Shopify product id passed as the query argument.
 * @returns The advisory live count, or `null` while it is unavailable.
 */
function PdpLiveAvailability({ query, productId }: PdpLiveAvailabilityProps) {
    const available = useQuery(query, { productId });
    if (available === undefined || available === null) {
        return null;
    }

    return (
        <span data-testid="pdp-live-availability" data-nosnippet={true}>
            {available}
        </span>
    );
}

/**
 * Code-split entry for the PDP live-availability island.
 *
 * This module is the storefront PDP's only reference to `convex/react`; it is
 * reached **exclusively** through the wrapper's interaction-gated dynamic
 * `import()`, so its bytes never enter the anonymous Lane-1 bundle the §5 guard
 * forbids. Unlike the draft/auth Lane-2 surfaces — which reuse the process
 * singleton in `convex-client-provider.tsx` — this public island owns a
 * **dedicated, ephemeral** {@link ConvexReactClient}: it opens the socket when the
 * leaf mounts (first interaction) and `close()`s it when the leaf unmounts. The
 * wrapper unmounts the leaf on tab-hidden, so that lifecycle is exactly what
 * makes the socket disconnect when the visitor leaves (spec §2.5) instead of a
 * singleton lingering open for idle tabs. The client reads only
 * `NEXT_PUBLIC_CONVEX_URL`, never request data; when it is unset the leaf renders
 * nothing and stays a no-op.
 *
 * @param props.query - The public Convex availability query reference.
 * @param props.productId - Shopify product id passed as the query argument.
 * @returns The live subscriber wrapped in its own Convex client context, or `null` when no deployment URL is configured.
 */
export default function PdpAvailabilityIslandLive({ query, productId }: PdpLiveAvailabilityProps) {
    const [client] = useState<ConvexReactClient | null>(() => {
        const url = process.env.NEXT_PUBLIC_CONVEX_URL;
        return url ? new ConvexReactClient(url) : null;
    });

    useEffect(() => {
        if (!client) {
            return;
        }

        return () => {
            client.close();
        };
    }, [client]);

    if (!client) {
        return null;
    }

    return (
        <ConvexProvider client={client}>
            <PdpLiveAvailability query={query} productId={productId} />
        </ConvexProvider>
    );
}
