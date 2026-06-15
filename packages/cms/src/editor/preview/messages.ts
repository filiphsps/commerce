/**
 * Shared `postMessage` vocabulary for the admin ⇄ storefront live-preview
 * bridge. Both sides of the handshake import THESE types and guards so the
 * wire contract can never drift: the storefront's `PreviewThemeBridge` posts
 * {@link ThemePreviewReadyMessage} up to the embedding admin window and applies
 * incoming {@link ThemePreviewMessage} CSS-variable overrides; the admin's
 * theme-preview hook constructs the messages this module's guards accept.
 *
 * Origin verification is the caller's job (each side pins the counterparty
 * origin on its `message` listener AND on every `postMessage` target); the
 * guards here only narrow the untrusted `MessageEvent.data` payload shape so a
 * structurally-malformed message from an allowed origin is still dropped.
 */

/** Discriminator for theme-override messages (admin → storefront iframe). */
export const THEME_PREVIEW_MESSAGE_TYPE = 'theme-preview' as const;

/** Discriminator for the readiness handshake (storefront iframe → admin). */
export const THEME_PREVIEW_READY_MESSAGE_TYPE = 'theme-preview-ready' as const;

/** Discriminator for content-preview messages (admin → storefront iframe). */
export const CONTENT_PREVIEW_MESSAGE_TYPE = 'content-preview' as const;

/** Discriminator for the content-preview readiness handshake (storefront iframe → admin). */
export const CONTENT_PREVIEW_READY_MESSAGE_TYPE = 'content-preview-ready' as const;

/**
 * A theme-override message posted by the admin theme editor into the
 * storefront preview iframe.
 *
 * `vars` are `[name, value]` pairs applied via `setProperty`; `remove` lists
 * variable names to clear via `removeProperty` so runtime-derived tokens
 * (accent light/dark shades, `focusRing: var(--accent)`) resume tracking the
 * SSR `<style>` instead of staying pinned to a stale override.
 */
export type ThemePreviewMessage = {
    type: typeof THEME_PREVIEW_MESSAGE_TYPE;
    vars?: Array<[name: string, value: string]>;
    remove?: string[];
};

/** The readiness handshake the storefront bridge posts once its listener is mounted. */
export type ThemePreviewReadyMessage = {
    type: typeof THEME_PREVIEW_READY_MESSAGE_TYPE;
};

/**
 * A content-preview message posted by the admin CMS content editor into the
 * storefront preview iframe. Carries the two channels of the hybrid pipe:
 *
 * - `patches` are `[dotted-field-path, text]` pairs the storefront bridge writes
 *   to the `textContent` of `[data-cms-field="<path>"]` elements — the *instant*
 *   optimistic layer for plain-text leaf fields, applied before a save lands.
 * - `refresh` requests a `router.refresh()` once the draft has persisted — the
 *   *accurate* layer that re-renders every block (rich-text + data-bound async
 *   blocks the client can't re-render from a serialized doc) against the freshly
 *   autosaved draft.
 *
 * Both are optional so a single message can carry an instant patch, a refresh,
 * or both.
 */
export type ContentPreviewMessage = {
    type: typeof CONTENT_PREVIEW_MESSAGE_TYPE;
    /** `[name, value]` plain-text patches applied via `textContent` to `[data-cms-field]`. */
    patches?: Array<[path: string, value: string]>;
    /** When `true`, the storefront bridge re-fetches the persisted draft via `router.refresh()`. */
    refresh?: boolean;
};

/** The readiness handshake the storefront content bridge posts once its listener is mounted. */
export type ContentPreviewReadyMessage = {
    type: typeof CONTENT_PREVIEW_READY_MESSAGE_TYPE;
};

/**
 * Narrows an untrusted record to `{ type: <expected> }`.
 *
 * @param data - The raw `MessageEvent.data` of unknown shape.
 * @param type - The expected discriminator value.
 * @returns `true` when `data` is an object carrying the discriminator.
 */
function hasMessageType(data: unknown, type: string): data is { type: string } {
    return typeof data === 'object' && data !== null && (data as { type?: unknown }).type === type;
}

/**
 * Validates one `vars` entry: a `[name, value]` string pair.
 *
 * @param entry - Candidate tuple.
 * @returns `true` when the entry is a two-string tuple.
 */
function isVarPair(entry: unknown): entry is [string, string] {
    return Array.isArray(entry) && entry.length === 2 && typeof entry[0] === 'string' && typeof entry[1] === 'string';
}

/**
 * Narrows an untrusted `postMessage` payload to a {@link ThemePreviewMessage},
 * validating the full structure (not just the discriminator) so the storefront
 * bridge never feeds malformed entries into `setProperty`/`removeProperty`.
 *
 * @param data - The raw `MessageEvent.data` of unknown shape.
 * @returns `true` when `data` is a well-formed theme-preview message.
 */
export function isThemePreviewMessage(data: unknown): data is ThemePreviewMessage {
    if (!hasMessageType(data, THEME_PREVIEW_MESSAGE_TYPE)) return false;
    const { vars, remove } = data as { vars?: unknown; remove?: unknown };
    if (vars !== undefined && !(Array.isArray(vars) && vars.every(isVarPair))) return false;
    if (remove !== undefined && !(Array.isArray(remove) && remove.every((name) => typeof name === 'string'))) {
        return false;
    }
    return true;
}

/**
 * Narrows an untrusted `postMessage` payload to a {@link ThemePreviewReadyMessage}.
 *
 * @param data - The raw `MessageEvent.data` of unknown shape.
 * @returns `true` when `data` is the readiness handshake.
 */
export function isThemePreviewReadyMessage(data: unknown): data is ThemePreviewReadyMessage {
    return hasMessageType(data, THEME_PREVIEW_READY_MESSAGE_TYPE);
}

/**
 * Narrows an untrusted `postMessage` payload to a {@link ContentPreviewMessage},
 * validating `patches` (a list of `[name, value]` string pairs) so the
 * storefront bridge never feeds a malformed entry into `textContent`. `refresh`
 * is a plain optional boolean.
 *
 * @param data - The raw `MessageEvent.data` of unknown shape.
 * @returns `true` when `data` is a well-formed content-preview message.
 */
export function isContentPreviewMessage(data: unknown): data is ContentPreviewMessage {
    if (!hasMessageType(data, CONTENT_PREVIEW_MESSAGE_TYPE)) return false;
    const { patches, refresh } = data as { patches?: unknown; refresh?: unknown };
    if (patches !== undefined && !(Array.isArray(patches) && patches.every(isVarPair))) return false;
    if (refresh !== undefined && typeof refresh !== 'boolean') return false;
    return true;
}

/**
 * Narrows an untrusted `postMessage` payload to a {@link ContentPreviewReadyMessage}.
 *
 * @param data - The raw `MessageEvent.data` of unknown shape.
 * @returns `true` when `data` is the content readiness handshake.
 */
export function isContentPreviewReadyMessage(data: unknown): data is ContentPreviewReadyMessage {
    return hasMessageType(data, CONTENT_PREVIEW_READY_MESSAGE_TYPE);
}
