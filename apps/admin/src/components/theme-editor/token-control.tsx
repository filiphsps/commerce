'use client';

import { THEME_DEFAULTS } from '@nordcom/commerce-db/lib/theme';
import type { ThemeTokenMeta } from '@nordcom/commerce-db/lib/theme-catalog';
import { useField } from '@payloadcms/ui';

import { resolveControl } from './control-registry';
import { type ControlValue, FieldRow } from './controls/field-row';

/**
 * Reads the platform default for a token from `THEME_DEFAULTS` by walking its
 * dotted `path` (minus the `theme.` root). `derived`/optional leaves are absent
 * from the defaults, so this returns `undefined` for them — exactly what reset
 * should write back to keep the storefront deriving the value.
 *
 * @param path - The token's dotted `theme.*` path.
 * @returns The default value, or `undefined` when the leaf is absent.
 */
function defaultAtPath(path: string): ControlValue {
    const segments = path.replace(/^theme\./, '').split('.');
    let cursor: unknown = THEME_DEFAULTS;
    for (const segment of segments) {
        if (cursor === null || typeof cursor !== 'object') return undefined;
        cursor = (cursor as Record<string, unknown>)[segment];
    }
    if (typeof cursor === 'string' || typeof cursor === 'number' || typeof cursor === 'boolean') {
        return cursor;
    }
    return undefined;
}

/**
 * Props for {@link TokenControl}.
 */
export type TokenControlProps = {
    /** Catalog metadata for the token to render. */
    token: ThemeTokenMeta;
};

/**
 * Dispatcher that renders the right control for a single catalog token. Resolves
 * the control component through the registry, binds the token's persisted dotted
 * `path` to Payload form state via `useField`, derives the default placeholder
 * from `THEME_DEFAULTS`, and wires reset (clear for `derived` tokens, otherwise
 * write the default) inside a {@link FieldRow}.
 *
 * The control writes the raw string/number/bool straight to `theme.*` form state
 * through `setValue`, so the existing `boundSaveDraft`/`boundPublish` toolbar
 * serializes and persists the whole `theme.*` subtree with no action changes.
 *
 * @param props.token - Catalog metadata for the rendered token.
 * @returns The labelled control row.
 */
export function TokenControl({ token }: TokenControlProps) {
    const fallback = defaultAtPath(token.path);
    const { value, setValue, showError } = useField<ControlValue>({ path: token.path });

    const Control = resolveControl(token);
    const placeholder = fallback === undefined ? undefined : String(fallback);

    const onReset = () => setValue(token.derived ? undefined : fallback);

    return (
        <FieldRow token={token} htmlFor={token.path} onReset={onReset} showError={showError}>
            <Control token={token} value={value} onChange={setValue} placeholder={placeholder} id={token.path} />
        </FieldRow>
    );
}
