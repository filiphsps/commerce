/**
 * A test-only `window.matchMedia` + `innerWidth`/`innerHeight` shim for
 * unit-testing responsive hooks and components under happy-dom/jsdom, where
 * `matchMedia` is otherwise undefined and the viewport size is fixed.
 *
 * It supports the width/height media features our responsive code actually
 * queries (`min-width`, `max-width`, `width`, the `-height` variants, and
 * `orientation`), combined with `and`. Anything outside that vocabulary is
 * treated as a non-match rather than silently passing, so a typo in a query
 * surfaces as a failing assertion instead of a false positive.
 */

/** A live media-query record returned by the shimmed `matchMedia`. */
type MediaQueryRecord = {
    query: string;
    listeners: Set<(event: MediaQueryListEvent) => void>;
    legacyListeners: Set<(event: MediaQueryListEvent) => void>;
    list: MediaQueryList;
};

/** Controls a installed shim: resize the emulated viewport, then restore globals. */
export type MatchMediaController = {
    /** Current emulated viewport width in px. */
    readonly width: number;
    /** Current emulated viewport height in px. */
    readonly height: number;
    /**
     * Resize the emulated viewport. Updates `innerWidth`/`innerHeight`, fires a
     * `resize` event, and re-evaluates every live `MediaQueryList`, dispatching
     * `change` to matched/unmatched listeners — exactly what a real resize does.
     *
     * @param next - New width, or `{ width, height }` to set both.
     */
    setViewport(next: number | { width?: number; height?: number }): void;
    /** Restore the original `matchMedia`/`innerWidth`/`innerHeight`. */
    cleanup(): void;
};

/** A single `(feature: value)` or bare `(orientation: ...)` clause. */
type Clause = { feature: string; value: string };

/**
 * Parses one media query string into its `and`-joined feature clauses. Media
 * type prefixes (`screen`, `all`, `only screen`) and a leading `and` are
 * tolerated and ignored — only feature clauses drive the match.
 *
 * @param query - The raw media query text.
 * @returns The parsed feature clauses.
 */
function parseClauses(query: string): Clause[] {
    const clauses: Clause[] = [];
    const featurePattern = /\(\s*([a-z-]+)\s*:\s*([^)]+?)\s*\)/g;
    let match: RegExpExecArray | null = featurePattern.exec(query);
    while (match !== null) {
        const feature = match[1];
        const value = match[2];
        if (feature && value) clauses.push({ feature, value: value.trim() });
        match = featurePattern.exec(query);
    }
    return clauses;
}

/**
 * Parses a CSS length to px. Only `px` (and unitless `0`) appear in our queries;
 * anything else yields `NaN` so an unsupported unit fails the match loudly.
 *
 * @param value - The raw length token.
 * @returns The numeric px value, or `NaN`.
 */
function toPx(value: string): number {
    if (value === '0') return 0;
    const px = /^(-?\d+(?:\.\d+)?)px$/.exec(value);
    return px?.[1] ? Number(px[1]) : Number.NaN;
}

/**
 * Evaluates a parsed query against an emulated viewport.
 *
 * @param clauses - The query's feature clauses (all must hold).
 * @param width - Emulated viewport width in px.
 * @param height - Emulated viewport height in px.
 * @returns Whether the query matches.
 */
function evaluate(clauses: Clause[], width: number, height: number): boolean {
    if (clauses.length === 0) return false;
    return clauses.every(({ feature, value }) => {
        switch (feature) {
            case 'min-width':
                return width >= toPx(value);
            case 'max-width':
                return width <= toPx(value);
            case 'width':
                return width === toPx(value);
            case 'min-height':
                return height >= toPx(value);
            case 'max-height':
                return height <= toPx(value);
            case 'height':
                return height === toPx(value);
            case 'orientation':
                return value === (width >= height ? 'landscape' : 'portrait');
            default:
                return false;
        }
    });
}

/**
 * Installs a controllable `matchMedia` shim on the target window and seeds its
 * `innerWidth`/`innerHeight`. Call {@link MatchMediaController.cleanup} (e.g. in
 * `afterEach`) to restore the originals.
 *
 * @param width - Initial emulated viewport width in px.
 * @param options - Optional initial `height` (defaults to 800) and `target`
 *   window (defaults to the global `window`).
 * @returns A controller to resize the viewport and restore globals.
 * @throws If no target window is available (e.g. a Node environment with no DOM).
 */
export function installMatchMedia(
    width: number,
    options: { height?: number; target?: Window & typeof globalThis } = {},
): MatchMediaController {
    const target = options.target ?? (globalThis as { window?: Window & typeof globalThis }).window;
    if (!target) {
        throw new Error('installMatchMedia: no window available — run under happy-dom/jsdom or pass `target`.');
    }

    let currentWidth = width;
    let currentHeight = options.height ?? 800;
    const records = new Set<MediaQueryRecord>();

    const original = {
        matchMedia: Object.getOwnPropertyDescriptor(target, 'matchMedia'),
        innerWidth: Object.getOwnPropertyDescriptor(target, 'innerWidth'),
        innerHeight: Object.getOwnPropertyDescriptor(target, 'innerHeight'),
    };

    const define = (key: 'innerWidth' | 'innerHeight', getter: () => number) => {
        Object.defineProperty(target, key, { configurable: true, get: getter });
    };
    define('innerWidth', () => currentWidth);
    define('innerHeight', () => currentHeight);

    const matchMedia = (query: string): MediaQueryList => {
        const clauses = parseClauses(query);
        const record: MediaQueryRecord = {
            query,
            listeners: new Set(),
            legacyListeners: new Set(),
            list: undefined as unknown as MediaQueryList,
        };
        const list: MediaQueryList = {
            get matches() {
                return evaluate(clauses, currentWidth, currentHeight);
            },
            media: query,
            onchange: null,
            addEventListener: (type: string, listener: unknown) => {
                if (type === 'change' && typeof listener === 'function') {
                    record.listeners.add(listener as (event: MediaQueryListEvent) => void);
                }
            },
            removeEventListener: (type: string, listener: unknown) => {
                if (type === 'change') record.listeners.delete(listener as (event: MediaQueryListEvent) => void);
            },
            // Deprecated MediaQueryList API still used by some libraries.
            addListener: (listener: unknown) => {
                if (listener) record.legacyListeners.add(listener as (event: MediaQueryListEvent) => void);
            },
            removeListener: (listener: unknown) => {
                if (listener) record.legacyListeners.delete(listener as (event: MediaQueryListEvent) => void);
            },
            dispatchEvent: () => true,
        };
        record.list = list;
        records.add(record);
        return list;
    };

    Object.defineProperty(target, 'matchMedia', { configurable: true, writable: true, value: matchMedia });

    const setViewport: MatchMediaController['setViewport'] = (next) => {
        const before = new Map<MediaQueryRecord, boolean>();
        for (const record of records) before.set(record, record.list.matches);

        if (typeof next === 'number') {
            currentWidth = next;
        } else {
            if (typeof next.width === 'number') currentWidth = next.width;
            if (typeof next.height === 'number') currentHeight = next.height;
        }

        target.dispatchEvent(new Event('resize'));

        for (const record of records) {
            const matches = record.list.matches;
            if (matches === before.get(record)) continue;
            const event = { matches, media: record.query } as MediaQueryListEvent;
            for (const listener of record.listeners) listener(event);
            for (const listener of record.legacyListeners) listener(event);
            record.list.onchange?.(event);
        }
    };

    const cleanup = () => {
        records.clear();
        const restore = (key: 'matchMedia' | 'innerWidth' | 'innerHeight') => {
            const descriptor = original[key];
            if (descriptor) Object.defineProperty(target, key, descriptor);
            else delete (target as unknown as Record<string, unknown>)[key];
        };
        restore('matchMedia');
        restore('innerWidth');
        restore('innerHeight');
    };

    return {
        get width() {
            return currentWidth;
        },
        get height() {
            return currentHeight;
        },
        setViewport,
        cleanup,
    };
}
