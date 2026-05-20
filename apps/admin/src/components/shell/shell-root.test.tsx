import { describe, expect, it, vi } from 'vitest';
import { ShellRoot } from '@/components/shell/shell-root';
import { render, screen } from '@/utils/test/react';

vi.mock('next/navigation', () => ({ usePathname: () => '/abc/', useRouter: () => ({ push: vi.fn() }) }));

describe('ShellRoot', () => {
    it('renders header, children, and slots (no subnav, no inspector)', () => {
        render(
            <ShellRoot
                header={<div data-testid="hdr">HEAD</div>}
                subnav={null}
                inspector={null}
                hasSubnav={false}
                hasInspector={false}
                initialState={{
                    rail: { w: 56, collapsed: true },
                    subnav: { w: 240, collapsed: false },
                    inspector: { w: 320, collapsed: true },
                }}
                iconRailItems={[]}
            >
                <div data-testid="content">CONTENT</div>
            </ShellRoot>,
        );
        expect(screen.getByTestId('hdr')).toBeInTheDocument();
        expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('renders the subnav slot when hasSubnav is true', () => {
        render(
            <ShellRoot
                header={<div>H</div>}
                subnav={<div data-testid="nav">NAV</div>}
                inspector={null}
                hasSubnav={true}
                hasInspector={false}
                initialState={{
                    rail: { w: 56, collapsed: true },
                    subnav: { w: 240, collapsed: false },
                    inspector: { w: 320, collapsed: true },
                }}
                iconRailItems={[]}
            >
                <div>C</div>
            </ShellRoot>,
        );
        expect(screen.getByTestId('nav')).toBeInTheDocument();
    });

    it('hides icon-rail labels when rail width is below the label threshold (159px)', () => {
        render(
            <ShellRoot
                header={<div>H</div>}
                subnav={null}
                inspector={null}
                hasSubnav={false}
                hasInspector={false}
                initialState={{
                    rail: { w: 159, collapsed: false },
                    subnav: { w: 240, collapsed: false },
                    inspector: { w: 320, collapsed: true },
                }}
                iconRailItems={[{ href: '/abc/' as never, label: 'Home', icon: <span data-testid="i-home" /> }]}
            >
                <div>C</div>
            </ShellRoot>,
        );
        // When icon-only, the label text is NOT rendered (only set as aria-label on the link).
        expect(screen.queryByText('Home')).not.toBeInTheDocument();
    });

    it('shows icon-rail labels at and above the label threshold (160px)', () => {
        render(
            <ShellRoot
                header={<div>H</div>}
                subnav={null}
                inspector={null}
                hasSubnav={false}
                hasInspector={false}
                initialState={{
                    rail: { w: 160, collapsed: false },
                    subnav: { w: 240, collapsed: false },
                    inspector: { w: 320, collapsed: true },
                }}
                iconRailItems={[{ href: '/abc/' as never, label: 'Home', icon: <span data-testid="i-home" /> }]}
            >
                <div>C</div>
            </ShellRoot>,
        );
        expect(screen.getByText('Home')).toBeInTheDocument();
    });
});
