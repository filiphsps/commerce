import { isValidElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const draftModeState = { isEnabled: false };
const cookiesSpy = vi.fn();
const headersSpy = vi.fn();

// `cookies()`/`headers()` are forbidden inside a `use cache` scope; the gate
// must read *only* `draftMode()`, so these throw to fail the test if the gate
// ever reaches for request data that would force the cached shell dynamic.
vi.mock('next/headers', () => ({
    draftMode: vi.fn(async () => ({ isEnabled: draftModeState.isEnabled })),
    cookies: () => {
        cookiesSpy();
        throw new Error('cookies() must not be read by the Convex provider gate');
    },
    headers: () => {
        headersSpy();
        throw new Error('headers() must not be read by the Convex provider gate');
    },
}));

import ReactiveIslandProvider from './reactive-island-provider';
import { ReactiveIslandProviderGate } from './reactive-island-provider-gate';

const SEO_SHELL = (
    <div data-testid="seo-shell">
        <h1>Crawlable heading</h1>
        <p>Static SEO body</p>
    </div>
);

describe('ReactiveIslandProviderGate', () => {
    beforeEach(() => {
        draftModeState.isEnabled = false;
        cookiesSpy.mockClear();
        headersSpy.mockClear();
    });

    it('returns the static shell byte-for-byte unchanged when draft mode is off (anonymous Lane-1)', async () => {
        const output = await ReactiveIslandProviderGate({ children: SEO_SHELL });

        // The strongest possible proof that mounting the provider does not alter
        // the prerendered shell: the gate hands back the exact same node, adding
        // no wrapper element and no Convex client reference.
        expect(output).toBe(SEO_SHELL);
        expect(renderToStaticMarkup(output as ReactElement)).toBe(renderToStaticMarkup(SEO_SHELL));
        expect(cookiesSpy).not.toHaveBeenCalled();
        expect(headersSpy).not.toHaveBeenCalled();
    });

    it('wraps the children in the code-split Convex provider when draft mode is on (Lane-2)', async () => {
        draftModeState.isEnabled = true;

        const output = await ReactiveIslandProviderGate({ children: SEO_SHELL });

        expect(isValidElement(output)).toBe(true);
        expect((output as ReactElement).type).toBe(ReactiveIslandProvider);
        expect(((output as ReactElement).props as { children: unknown }).children).toBe(SEO_SHELL);
        // Even on the Lane-2 path the gate never reaches for cookies/headers.
        expect(cookiesSpy).not.toHaveBeenCalled();
        expect(headersSpy).not.toHaveBeenCalled();
    });
});
