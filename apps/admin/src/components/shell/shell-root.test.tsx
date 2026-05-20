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
});
