import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// Side-effect CSS import in the server entry — stub it so Vitest's Node
// runner doesn't choke on an unknown `.css` extension.
vi.mock('@payloadcms/ui/css', () => ({}));

vi.mock('./payload-field-shell-inner', () => ({
    PayloadFieldShellInner: ({ children, theme }: { children: ReactNode; theme: string }) => (
        <div data-testid="inner" data-theme={theme}>
            {children}
        </div>
    ),
}));

import { PayloadFieldShell } from './payload-field-shell';

const STUB_PROPS = {
    config: {} as never,
    serverFunction: (() => {}) as never,
    dateFNSKey: 'en-US' as never,
    fallbackLang: 'en' as never,
    languageCode: 'en',
    languageOptions: [] as never,
    permissions: {} as never,
    theme: 'dark' as const,
    translations: {} as never,
    user: null,
};

describe('PayloadFieldShell (server wrapper)', () => {
    it('forwards every prop to the client inner', () => {
        const html = renderToStaticMarkup(
            <PayloadFieldShell {...STUB_PROPS}>
                <span data-testid="probe">child</span>
            </PayloadFieldShell>,
        );
        expect(html).toContain('data-testid="inner"');
        expect(html).toContain('data-theme="dark"');
        expect(html).toContain('data-testid="probe"');
    });
});
