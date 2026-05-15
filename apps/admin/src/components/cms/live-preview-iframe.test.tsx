import { fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LivePreviewIframe } from '@/components/cms/live-preview-iframe';
import { render, screen } from '@/utils/test/react';

// ------------------------------------------------------------------
// Mock next/navigation — the component doesn't use it directly, but
// the test wrapper may pull it in transitively. Mock defensively.
// ------------------------------------------------------------------

vi.mock('next/navigation', () => ({
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => '/',
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// ------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------

const PREVIEW_URL = 'http://localhost:1337/__by-tenant/test-shop.com/en-US/about?preview=1&secret=test-secret';

const BASE_PROPS = {
    previewUrl: PREVIEW_URL,
    domain: 'test-shop.com',
} as const;

// ------------------------------------------------------------------
// localStorage mock — replace the instance methods so happy-dom's own
// storage doesn't interfere and we can assert on the calls.
// ------------------------------------------------------------------

const makeLocalStorageMock = () => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((_key: string): string | null => null),
        setItem: vi.fn((key: string, value: string): void => {
            store[key] = value;
        }),
        removeItem: vi.fn((key: string): void => {
            delete store[key];
        }),
        clear: vi.fn((): void => {
            store = {};
        }),
    };
};

let localStorageMock = makeLocalStorageMock();

beforeEach(() => {
    localStorageMock = makeLocalStorageMock();
    Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        writable: true,
        configurable: true,
    });
});

afterEach(() => {
    vi.restoreAllMocks();
});

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

describe('LivePreviewIframe', () => {
    it('hides the iframe by default (defaultOpen is false)', () => {
        render(<LivePreviewIframe {...BASE_PROPS} />);

        // No iframe should be in the DOM until the user opens the panel.
        expect(screen.queryByTitle('Live preview')).not.toBeInTheDocument();
    });

    it('renders a "Show preview" toggle button in the header bar when closed', () => {
        render(<LivePreviewIframe {...BASE_PROPS} />);

        // The header-bar toggle carries aria-label="Show preview" when the panel is closed.
        expect(screen.getByRole('button', { name: 'Show preview' })).toBeInTheDocument();
    });

    it('shows the iframe with the previewUrl prop as src after clicking the toggle', () => {
        render(<LivePreviewIframe {...BASE_PROPS} />);

        const toggleBtn = screen.getByRole('button', { name: 'Show preview' });
        fireEvent.click(toggleBtn);

        const iframe = screen.getByTitle('Live preview');
        expect(iframe).toBeInTheDocument();
        expect(iframe).toHaveAttribute('src', PREVIEW_URL);
    });

    it('hides the iframe again after clicking the close/hide toggle button', () => {
        render(<LivePreviewIframe {...BASE_PROPS} defaultOpen />);

        // Panel is open — iframe is visible.
        expect(screen.getByTitle('Live preview')).toBeInTheDocument();

        // The header-bar toggle button hides the panel.
        const hideBtn = screen.getByRole('button', { name: /hide preview/i });
        fireEvent.click(hideBtn);

        expect(screen.queryByTitle('Live preview')).not.toBeInTheDocument();
    });

    it('shows the refresh button only when the panel is open', () => {
        render(<LivePreviewIframe {...BASE_PROPS} />);

        // Closed state — no refresh button.
        expect(screen.queryByRole('button', { name: /refresh preview/i })).not.toBeInTheDocument();

        // Open the panel.
        fireEvent.click(screen.getByRole('button', { name: 'Show preview' }));

        // Now the refresh button appears.
        expect(screen.getByRole('button', { name: /refresh preview/i })).toBeInTheDocument();
    });

    it('reassigns iframe.src on refresh (cross-origin reload workaround)', () => {
        render(<LivePreviewIframe {...BASE_PROPS} defaultOpen />);

        const iframe = screen.getByTitle('Live preview') as HTMLIFrameElement;

        // Track src assignments via a property descriptor spy.
        let assignedSrc: string | null = null;
        const srcDescriptor =
            Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src') ??
            Object.getOwnPropertyDescriptor(Element.prototype, 'src');

        const setSpy = vi.fn((value: string) => {
            assignedSrc = value;
            // Call the original setter if available so happy-dom stays consistent.
            if (srcDescriptor?.set) srcDescriptor.set.call(iframe, value);
        });

        Object.defineProperty(iframe, 'src', {
            get: () => assignedSrc ?? PREVIEW_URL,
            set: setSpy,
            configurable: true,
        });

        const refreshBtn = screen.getByRole('button', { name: /refresh preview/i });
        fireEvent.click(refreshBtn);

        // The component must have written to iframe.src — the cross-origin reload
        // pattern (`iframe.src = iframe.src`) rather than
        // `contentWindow.location.reload()` which throws SecurityError across origins.
        expect(setSpy).toHaveBeenCalledTimes(1);
    });

    it('renders with defaultOpen=true and shows the iframe immediately', () => {
        render(<LivePreviewIframe {...BASE_PROPS} defaultOpen />);

        expect(screen.getByTitle('Live preview')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Show preview' })).not.toBeInTheDocument();
    });

    it('persists open state to a tenant-scoped localStorage key when toggled', () => {
        render(<LivePreviewIframe {...BASE_PROPS} />);

        fireEvent.click(screen.getByRole('button', { name: 'Show preview' }));

        // Key is scoped to the domain so different tenants don't share state.
        expect(localStorageMock.setItem).toHaveBeenCalledWith('cms.live-preview.test-shop.com.open', 'true');
    });

    it('falls back to a global localStorage key when no domain is provided', () => {
        render(<LivePreviewIframe previewUrl={PREVIEW_URL} />);

        fireEvent.click(screen.getByRole('button', { name: 'Show preview' }));

        expect(localStorageMock.setItem).toHaveBeenCalledWith('cms.live-preview.open', 'true');
    });
});
