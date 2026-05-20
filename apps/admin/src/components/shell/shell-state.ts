import { z } from 'zod';

export const SHELL_STATE_COOKIE = 'nc-admin-shell';

const ShellPaneState = z.object({
    w: z.number().int().min(0).max(1000),
    collapsed: z.boolean(),
});

export const ShellState = z.object({
    rail: ShellPaneState,
    subnav: ShellPaneState,
    inspector: ShellPaneState,
});

export type ShellState = z.infer<typeof ShellState>;

export const DEFAULT_SHELL_STATE: ShellState = {
    rail: { w: 52, collapsed: true },
    subnav: { w: 240, collapsed: false },
    inspector: { w: 320, collapsed: true },
};

export function parseShellState(raw: string | undefined): ShellState {
    if (!raw) return DEFAULT_SHELL_STATE;
    try {
        const decoded = decodeURIComponent(raw);
        const json: unknown = JSON.parse(decoded);
        const parsed = ShellState.safeParse(json);
        return parsed.success ? parsed.data : DEFAULT_SHELL_STATE;
    } catch {
        return DEFAULT_SHELL_STATE;
    }
}

export function serializeShellState(state: ShellState): string {
    return encodeURIComponent(JSON.stringify(state));
}
