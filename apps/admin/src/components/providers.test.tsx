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
// is unrelated to the render passthrough we are pinning here.
vi.mock('sonner', () => ({
    Toaster: () => null,
}));

describe('Providers', () => {
    // The Payload-era faceless-ui ModalProvider fallback is gone (TEARDOWN-02);
    // the provider tree's remaining contract is that children render inside it.
    it('renders descendants through the provider tree', () => {
        render(
            <Providers>
                <span data-testid="probe">ok</span>
            </Providers>,
        );

        expect(screen.getByTestId('probe').textContent).toBe('ok');
    });
});
