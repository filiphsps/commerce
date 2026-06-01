import { act, render, waitFor } from '@testing-library/react';
import { preloadQuery } from 'convex/nextjs';
import { cookies, draftMode, headers } from 'next/headers';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { PdpAvailabilityIsland } from '@/components/convex/pdp-availability-island';
import type { AvailabilityQuery } from '@/components/convex/pdp-availability-island-live';

// `close` is shared across every constructed client so the test can assert the
// socket is torn down on tab-hidden regardless of which instance owns it.
const convex = vi.hoisted(() => {
    const close = vi.fn();
    // A regular function expression (not an arrow) so the mock is `new`-able.
    function ConvexReactClientMock(this: Record<string, unknown>, url: string) {
        this.url = url;
        this.close = close;
    }
    return {
        close,
        useQuery: vi.fn((): number | null => 7),
        ConvexReactClient: vi.fn(ConvexReactClientMock),
    };
});

vi.mock('convex/react', () => ({
    ConvexProvider: ({ children }: { children: ReactNode }) => children,
    ConvexReactClient: convex.ConvexReactClient,
    useQuery: convex.useQuery,
}));

// `preloadQuery`/`fetchQuery` are `no-store`; reaching for either during the
// prerender would poison the `use cache` PDP shell. Spies prove the static path
// never touches them.
vi.mock('convex/nextjs', () => ({
    preloadQuery: vi.fn(),
    fetchQuery: vi.fn(),
}));

// The anonymous PDP path must read no request data — touching any of these would
// force the static shell dynamic.
vi.mock('next/headers', () => ({
    cookies: vi.fn(),
    draftMode: vi.fn(),
    headers: vi.fn(),
}));

const PRODUCT_ID = 'gid://shopify/Product/123';
const availabilityQuery = {} as unknown as AvailabilityQuery;

/**
 * The cached, crawlable availability snapshot rendered as the real Lane-1 SEO
 * content (the analog of the PDP's `VariantStockUrgency` callout).
 *
 * @returns A static, indexable availability line.
 */
function AvailabilitySnapshot() {
    return (
        <span data-testid="pdp-availability-snapshot" className="pdp-stock-urgency">
            Only a few left
        </span>
    );
}

/**
 * Wraps a candidate availability node in a representative PDP static SEO body so
 * the test asserts coexistence on the same crawlable shell the real route emits.
 *
 * @param availability - The availability region (the bare snapshot or the island wrapping it).
 * @returns The PDP SEO body element.
 */
function SeoBody(availability: ReactNode) {
    return (
        <article>
            <h1>Nordcom Commerce Test Hoodie</h1>
            <p>A crawlable, indexed product description that must survive prerender.</p>
            {availability}
        </article>
    );
}

let documentHidden = false;

beforeAll(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => documentHidden });
});

beforeEach(() => {
    documentHidden = false;
    convex.useQuery.mockClear();
    convex.ConvexReactClient.mockClear();
    convex.close.mockClear();
    vi.mocked(preloadQuery).mockClear();
    vi.mocked(cookies).mockClear();
    vi.mocked(draftMode).mockClear();
    vi.mocked(headers).mockClear();
});

describe('PDP Lane-1/Lane-2 PPR coexistence — prerender (static shell)', () => {
    it('is byte-identical with and without the island mounted (island is a transparent Suspense hole)', () => {
        const withIsland = renderToStaticMarkup(
            SeoBody(
                <PdpAvailabilityIsland query={availabilityQuery} productId={PRODUCT_ID}>
                    <AvailabilitySnapshot />
                </PdpAvailabilityIsland>,
            ),
        );
        const snapshotOnly = renderToStaticMarkup(SeoBody(<AvailabilitySnapshot />));

        // The strongest proof the Lane-2 island cannot perturb the prerendered
        // Lane-1 shell: mounting it adds no DOM and no Convex reference.
        expect(withIsland).toBe(snapshotOnly);
    });

    it('emits the crawlable SEO + availability snapshot and never the live leaf or a Convex/WebSocket reference', () => {
        const markup = renderToStaticMarkup(
            SeoBody(
                <PdpAvailabilityIsland query={availabilityQuery} productId={PRODUCT_ID}>
                    <AvailabilitySnapshot />
                </PdpAvailabilityIsland>,
            ),
        );

        expect(markup).toContain('Nordcom Commerce Test Hoodie');
        expect(markup).toContain('Only a few left');
        // The reactive leaf is excluded from the prerender — it is a dynamic hole
        // streamed only at request time / on interaction.
        expect(markup).not.toContain('pdp-live-availability');
        expect(markup.toLowerCase()).not.toContain('convex');
        expect(markup).not.toMatch(/wss?:\/\//);
    });

    it('calls neither preloadQuery/fetchQuery nor any request API while prerendering', () => {
        renderToStaticMarkup(
            SeoBody(
                <PdpAvailabilityIsland query={availabilityQuery} productId={PRODUCT_ID}>
                    <AvailabilitySnapshot />
                </PdpAvailabilityIsland>,
            ),
        );

        expect(preloadQuery).not.toHaveBeenCalled();
        expect(convex.useQuery).not.toHaveBeenCalled();
        expect(convex.ConvexReactClient).not.toHaveBeenCalled();
        expect(cookies).not.toHaveBeenCalled();
        expect(headers).not.toHaveBeenCalled();
        expect(draftMode).not.toHaveBeenCalled();
    });
});

describe('PDP Lane-1/Lane-2 PPR coexistence — interaction-gated reactive island', () => {
    beforeAll(() => {
        process.env.NEXT_PUBLIC_CONVEX_URL = 'https://example-test.convex.cloud';
    });

    afterAll(() => {
        delete process.env.NEXT_PUBLIC_CONVEX_URL;
    });

    it('opens no socket anonymously, subscribes only on interaction, and disconnects on tab-hidden', async () => {
        const { findByTestId, queryByTestId } = render(
            <PdpAvailabilityIsland query={availabilityQuery} productId={PRODUCT_ID}>
                <AvailabilitySnapshot />
            </PdpAvailabilityIsland>,
        );

        // Anonymous / idle render: the snapshot is painted, but no Convex client
        // is constructed and no query subscribes — no WebSocket is opened.
        expect(queryByTestId('pdp-availability-snapshot')).not.toBeNull();
        expect(queryByTestId('pdp-live-availability')).toBeNull();
        expect(convex.ConvexReactClient).not.toHaveBeenCalled();
        expect(convex.useQuery).not.toHaveBeenCalled();

        // Explicit interaction upgrades to live: the chunk loads, the socket opens
        // and the query subscribes.
        await act(async () => {
            window.dispatchEvent(new Event('pointerdown'));
        });
        const live = await findByTestId('pdp-live-availability');
        expect(live).toHaveTextContent('7');
        expect(convex.ConvexReactClient).toHaveBeenCalledTimes(1);
        expect(convex.useQuery).toHaveBeenCalled();

        // Tab hidden: the live leaf unmounts and its socket closes (disconnect on
        // tab-hidden); the crawlable snapshot stays put.
        documentHidden = true;
        await act(async () => {
            document.dispatchEvent(new Event('visibilitychange'));
        });
        await waitFor(() => expect(queryByTestId('pdp-live-availability')).toBeNull());
        expect(convex.close).toHaveBeenCalledTimes(1);
        expect(queryByTestId('pdp-availability-snapshot')).not.toBeNull();

        // Tab visible again: the leaf remounts and a fresh socket reopens.
        documentHidden = false;
        await act(async () => {
            document.dispatchEvent(new Event('visibilitychange'));
        });
        await findByTestId('pdp-live-availability');
        expect(convex.ConvexReactClient).toHaveBeenCalledTimes(2);
    });
});
