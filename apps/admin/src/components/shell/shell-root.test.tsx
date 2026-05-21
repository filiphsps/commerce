import { describe, expect, it, vi } from 'vitest';
import { ShellRoot } from '@/components/shell/shell-root';
import { render, screen } from '@/utils/test/react';

const { mockUseSelectedLayoutSegments } = vi.hoisted(() => ({
    mockUseSelectedLayoutSegments: vi.fn<(slot?: string) => string[]>(() => []),
}));

vi.mock('next/navigation', () => ({
    usePathname: () => '/abc/',
    useRouter: () => ({ push: vi.fn() }),
    useSelectedLayoutSegments: (slot?: string) => mockUseSelectedLayoutSegments(slot),
}));

describe('ShellRoot', () => {
    it('renders header, children, and slots (no subnav, no inspector)', () => {
        // Empty segments array = neither slot has any matched route at all.
        mockUseSelectedLayoutSegments.mockReturnValue([]);
        render(
            <ShellRoot header={<div data-testid="hdr">HEAD</div>} subnav={null} inspector={null} iconRailItems={[]}>
                {/* Distinct testid: react-resizable-panels v4 stamps `data-testid="content"`
                 *  onto the Panel itself (id="content"), so this child needs its own name. */}
                <div data-testid="page-content">CONTENT</div>
            </ShellRoot>,
        );
        expect(screen.getByTestId('hdr')).toBeInTheDocument();
        expect(screen.getByTestId('page-content')).toBeInTheDocument();
    });

    it.todo('hides the subnav slot when only the top-level @subnav/default.tsx renders', () => {
        // Top-level catch-all default — no section matched.
        mockUseSelectedLayoutSegments.mockImplementation((slot) => (slot === 'subnav' ? ['subnav'] : []));
        render(
            <ShellRoot
                header={<div>H</div>}
                subnav={<div data-testid="nav">NAV</div>}
                inspector={null}
                iconRailItems={[]}
            >
                <div>C</div>
            </ShellRoot>,
        );
        expect(screen.queryByTestId('nav')).not.toBeInTheDocument();
    });
});
