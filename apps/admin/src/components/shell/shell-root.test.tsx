import { describe, expect, it, vi } from 'vitest';
import { isSlotActive, ShellRoot } from '@/components/shell/shell-root';
import { render, screen } from '@/utils/test/react';

const { mockUseSelectedLayoutSegments } = vi.hoisted(() => ({
    mockUseSelectedLayoutSegments: vi.fn<(slot?: string) => string[]>(() => []),
}));

vi.mock('next/navigation', () => ({
    usePathname: () => '/abc/',
    useRouter: () => ({ push: vi.fn() }),
    useSelectedLayoutSegments: (slot?: string) => mockUseSelectedLayoutSegments(slot),
}));

describe('isSlotActive', () => {
    it('is inactive for the default-only slot (root default.tsx)', () => {
        // The root @subnav/@inspector default renders nothing; Next reports it as `['__DEFAULT__']`.
        expect(isSlotActive(['__DEFAULT__'])).toBe(false);
    });

    it('is inactive for an empty segment list', () => {
        expect(isSlotActive([])).toBe(false);
    });

    it('is inactive for a null result (outside the app router)', () => {
        expect(isSlotActive(null)).toBe(false);
    });

    it('is active when a real section matched (section + trailing default)', () => {
        // A default-only section slot (e.g. @subnav/settings/default.tsx) reports the section
        // segment followed by the trailing `__DEFAULT__` leaf.
        expect(isSlotActive(['settings', '__DEFAULT__'])).toBe(true);
        expect(isSlotActive(['content', '__DEFAULT__'])).toBe(true);
    });
});

describe('ShellRoot', () => {
    it('renders header, children, and slots (no subnav, no inspector)', () => {
        // Empty segments array = neither slot has any matched route at all.
        mockUseSelectedLayoutSegments.mockReturnValue([]);
        render(
            <ShellRoot header={<div data-testid="hdr">HEAD</div>} subnav={null} inspector={null} iconRailGroups={[]}>
                {/* Distinct testid: react-resizable-panels v4 stamps `data-testid="content"`
                 *  onto the Panel itself (id="content"), so this child needs its own name. */}
                <div data-testid="page-content">CONTENT</div>
            </ShellRoot>,
        );
        expect(screen.getByTestId('hdr')).toBeInTheDocument();
        expect(screen.getByTestId('page-content')).toBeInTheDocument();
    });

    it('hides the subnav slot when only the top-level @subnav/default.tsx renders', () => {
        // Top-level catch-all default — no section matched, so Next reports `['__DEFAULT__']`.
        mockUseSelectedLayoutSegments.mockImplementation((slot) =>
            slot === 'subnav' ? ['__DEFAULT__'] : ['__DEFAULT__'],
        );
        render(
            <ShellRoot
                header={<div>H</div>}
                subnav={<div data-testid="nav">NAV</div>}
                inspector={null}
                iconRailGroups={[]}
            >
                <div>C</div>
            </ShellRoot>,
        );
        expect(screen.queryByTestId('nav')).not.toBeInTheDocument();
    });

    it('shows the subnav slot when a section matched', () => {
        mockUseSelectedLayoutSegments.mockImplementation((slot) =>
            slot === 'subnav' ? ['settings', '__DEFAULT__'] : ['__DEFAULT__'],
        );
        render(
            <ShellRoot
                header={<div>H</div>}
                subnav={<div data-testid="nav">NAV</div>}
                inspector={null}
                iconRailGroups={[]}
            >
                <div>C</div>
            </ShellRoot>,
        );
        expect(screen.getByTestId('nav')).toBeInTheDocument();
    });
});
