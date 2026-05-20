import { useModal } from '@faceless-ui/modal';
import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Providers } from '@/components/providers';
import { render, screen } from '@/utils/test/react';

// ------------------------------------------------------------------
// Mocks — third-party providers/modules that can't run in happy-dom
// or pull in heavy runtime dependencies we don't care about here.
// ------------------------------------------------------------------

vi.mock('nextjs-toploader', () => ({
    default: () => null,
}));

vi.mock('@next/third-parties/google', () => ({
    GoogleTagManager: () => null,
}));

vi.mock('@/components/header-provider', () => ({
    HeaderProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// `@nordcom/nordstar` pulls in CSS module files from its subpackages
// which the Vitest CSS transformer rejects. We only care about its
// component shells acting as passthroughs in this test.
vi.mock('@nordcom/nordstar', () => ({
    NordstarProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// `@nordcom/commerce-marketing-common` re-exports the Nordstar theme;
// stub a minimal object that matches the few fields `<Providers>` reads.
vi.mock('@nordcom/commerce-marketing-common', () => ({
    Theme: { accents: { primary: '#000000' } },
}));

// `sonner` does not need to actually render in this test — its provider
// is unrelated to the modal context regression we are pinning here.
vi.mock('sonner', () => ({
    Toaster: () => null,
}));

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

describe('Providers', () => {
    /**
     * Regression test for the production crash:
     *   `TypeError: can't access property "doc-drawer_media_0__r_…", m is undefined`
     *
     * Payload's `useDocumentDrawer` reads `modalState[drawerSlug]?.isOpen`
     * inside a `useEffect`. The optional chain only guards `.isOpen` — if
     * `modalState` itself is `undefined` (which happens when there is no
     * `@faceless-ui/modal` `<ModalProvider>` in the React tree above), the
     * subscript access throws on first paint of any upload field.
     *
     * `<PayloadFieldShell>` mounts a scoped `<ModalProvider>` for embedded
     * Payload forms, but a regression in route wiring (a Payload field
     * rendered outside the shell, a future page that forgets to use
     * `<DocumentForm>`, or an upload nested inside a lexical-rich-text
     * surface) would crash the admin. The top-level `<Providers>` mounts a
     * fallback `<ModalProvider>` so the context is always available — these
     * tests assert that fallback is wired correctly.
     */
    it('exposes a defined modalState via useModal to descendants', () => {
        function ModalProbe() {
            const { modalState } = useModal();
            // `modalState` defaults to `{}` (from the ModalProvider's reducer
            // initial state) when the provider is mounted. Without the
            // provider, `useModal()` returns `{}` and `modalState` is
            // `undefined` — which is the bug we are guarding against.
            return <span data-testid="modal-state">{modalState ? 'defined' : 'undefined'}</span>;
        }

        render(
            <Providers>
                <ModalProbe />
            </Providers>,
        );

        expect(screen.getByTestId('modal-state').textContent).toBe('defined');
    });

    it("does not crash when a descendant exercises Payload's drawer-state subscript pattern", () => {
        // Mirrors the exact access pattern inside `@payloadcms/ui`'s
        // `useDocumentDrawer` hook: an effect that subscripts
        // `modalState[drawerSlug]?.isOpen`. Without a `<ModalProvider>`
        // above, `modalState` is `undefined` and the subscript throws —
        // which is the production stack trace we are pinning.
        function PayloadDrawerLikeProbe() {
            const { modalState } = useModal();
            useEffect(() => {
                // Identical to Payload's hook (see
                // node_modules/@payloadcms/ui/dist/elements/DocumentDrawer/index.js).
                const isOpen = Boolean(modalState[`doc-drawer_media_0__r_test_`]?.isOpen);
                // `void` so the linter is happy with the discarded value.
                void isOpen;
            }, [modalState]);
            return <span data-testid="drawer-probe">ok</span>;
        }

        expect(() =>
            render(
                <Providers>
                    <PayloadDrawerLikeProbe />
                </Providers>,
            ),
        ).not.toThrow();

        expect(screen.getByTestId('drawer-probe')).toBeInTheDocument();
    });
});
