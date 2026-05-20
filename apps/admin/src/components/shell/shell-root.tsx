'use client';

import { type ReactNode, useCallback, useRef } from 'react';
import {
    type ImperativePanelGroupHandle,
    type ImperativePanelHandle,
    Panel,
    PanelGroup,
    PanelResizeHandle,
} from 'react-resizable-panels';

import { IconRail, type IconRailItem } from '@/components/shell/icon-rail';
import { InspectorSlot } from '@/components/shell/inspector-slot';
import { SHELL_STATE_COOKIE, type ShellState, serializeShellState } from '@/components/shell/shell-state';
import { SubNavSlot } from '@/components/shell/sub-nav-slot';
import { useBreakpoint } from '@/components/shell/use-breakpoint';

export type ShellRootProps = {
    /** Page content. */
    children: ReactNode;
    /** Server-resolved @subnav slot. */
    subnav: ReactNode;
    /** Server-resolved @inspector slot. */
    inspector: ReactNode;
    /** Pre-rendered header (server component). */
    header: ReactNode;
    hasSubnav: boolean;
    hasInspector: boolean;
    initialState: ShellState;
    iconRailItems: IconRailItem[];
};

const RAIL_MIN_PX = 56;
const RAIL_MAX_PX = 280;
const SUBNAV_MIN_PX = 200;
const SUBNAV_MAX_PX = 480;
const INSPECTOR_MIN_PX = 240;
const INSPECTOR_MAX_PX = 560;

function pxToPercent(px: number, totalPx: number): number {
    if (totalPx <= 0) return 10;
    return Math.max(0, Math.min(100, (px / totalPx) * 100));
}

function writeShellStateCookie(state: ShellState): void {
    document.cookie = `${SHELL_STATE_COOKIE}=${serializeShellState(state)}; max-age=31536000; path=/; samesite=lax`;
}

export function ShellRoot({
    children,
    subnav,
    inspector,
    header,
    hasSubnav,
    hasInspector,
    initialState,
    iconRailItems,
}: ShellRootProps) {
    const breakpoint = useBreakpoint();
    const groupRef = useRef<ImperativePanelGroupHandle | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const railRef = useRef<ImperativePanelHandle | null>(null);
    const subnavRef = useRef<ImperativePanelHandle | null>(null);
    const inspectorRef = useRef<ImperativePanelHandle | null>(null);

    const stateRef = useRef<ShellState>(initialState);

    const writeTimer = useRef<number | null>(null);
    const scheduleWrite = useCallback(() => {
        if (writeTimer.current !== null) window.clearTimeout(writeTimer.current);
        writeTimer.current = window.setTimeout(() => writeShellStateCookie(stateRef.current), 250);
    }, []);

    const fallbackTotal = typeof window === 'undefined' ? 1440 : window.innerWidth || 1440;
    const totalPx = () => containerRef.current?.getBoundingClientRect().width ?? fallbackTotal;

    const railDefaultPct = pxToPercent(initialState.rail.w, fallbackTotal);
    const subnavDefaultPct = pxToPercent(initialState.subnav.w, fallbackTotal);
    const inspectorDefaultPct = pxToPercent(initialState.inspector.w, fallbackTotal);

    const onLayoutChange = useCallback(
        (sizes: number[]) => {
            const total = totalPx();
            if (total <= 0) return;
            const railPct = sizes[0] ?? railDefaultPct;
            const subnavPct = sizes[1] ?? subnavDefaultPct;
            const inspectorPct = sizes[sizes.length - 1] ?? inspectorDefaultPct;
            stateRef.current = {
                rail: { w: Math.round((railPct / 100) * total), collapsed: stateRef.current.rail.collapsed },
                subnav: {
                    w: Math.round((subnavPct / 100) * total),
                    collapsed: stateRef.current.subnav.collapsed,
                },
                inspector: {
                    w: Math.round((inspectorPct / 100) * total),
                    collapsed: stateRef.current.inspector.collapsed,
                },
            };
            scheduleWrite();
        },
        [railDefaultPct, subnavDefaultPct, inspectorDefaultPct, scheduleWrite],
    );

    return (
        <div className="grid h-svh grid-rows-[56px_1fr] overflow-hidden">
            {header}
            {breakpoint === 'mobile' || breakpoint === 'tablet' ? (
                <main className="relative min-w-0 overflow-hidden">{children}</main>
            ) : (
                <div ref={containerRef} className="contents">
                    <PanelGroup ref={groupRef} direction="horizontal" onLayout={onLayoutChange}>
                        <Panel
                            ref={railRef}
                            id="rail"
                            order={1}
                            defaultSize={railDefaultPct}
                            minSize={pxToPercent(RAIL_MIN_PX, fallbackTotal)}
                            maxSize={pxToPercent(RAIL_MAX_PX, fallbackTotal)}
                            collapsible
                            collapsedSize={pxToPercent(RAIL_MIN_PX, fallbackTotal)}
                        >
                            <IconRail items={iconRailItems} expanded={initialState.rail.w > RAIL_MIN_PX + 16} />
                        </Panel>

                        {hasSubnav ? (
                            <>
                                <PanelResizeHandle className="w-px bg-border transition-colors hover:bg-primary/50 data-[resize-handle-state=drag]:bg-primary" />
                                <Panel
                                    ref={subnavRef}
                                    id="subnav"
                                    order={2}
                                    defaultSize={subnavDefaultPct}
                                    minSize={pxToPercent(SUBNAV_MIN_PX, fallbackTotal)}
                                    maxSize={pxToPercent(SUBNAV_MAX_PX, fallbackTotal)}
                                    collapsible
                                    collapsedSize={0}
                                >
                                    <SubNavSlot>{subnav}</SubNavSlot>
                                </Panel>
                            </>
                        ) : null}

                        <PanelResizeHandle className="w-px bg-border transition-colors hover:bg-primary/50 data-[resize-handle-state=drag]:bg-primary" />
                        <Panel id="content" order={3} minSize={20}>
                            <main className="relative h-full min-w-0 overflow-hidden">{children}</main>
                        </Panel>

                        {hasInspector && (breakpoint === 'wide' || breakpoint === 'comfortable') ? (
                            <>
                                <PanelResizeHandle className="w-px bg-border transition-colors hover:bg-primary/50 data-[resize-handle-state=drag]:bg-primary" />
                                <Panel
                                    ref={inspectorRef}
                                    id="inspector"
                                    order={4}
                                    defaultSize={inspectorDefaultPct}
                                    minSize={pxToPercent(INSPECTOR_MIN_PX, fallbackTotal)}
                                    maxSize={pxToPercent(INSPECTOR_MAX_PX, fallbackTotal)}
                                    collapsible
                                    collapsedSize={0}
                                >
                                    <InspectorSlot>{inspector}</InspectorSlot>
                                </Panel>
                            </>
                        ) : null}
                    </PanelGroup>
                </div>
            )}
        </div>
    );
}
