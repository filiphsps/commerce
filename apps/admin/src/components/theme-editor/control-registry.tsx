'use client';

import { FONT_FAMILIES, type ThemeTokenMeta, type ValueKind } from '@nordcom/commerce-db';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ColorControl } from './controls/color-control';
import { DimensionControl } from './controls/dimension-control';
import type { Control, ControlProps } from './controls/field-row';
import { NumberControl } from './controls/number-control';
import { SelectControl } from './controls/select-control';
import { SwitchControl } from './controls/switch-control';

/**
 * Font-family select that previews each allowlisted family in its own typeface.
 * Options come from `FONT_FAMILIES` (the single allowlist the storefront loads),
 * so the catalog never restates the font list. Best-effort preview: the admin
 * does not bundle the storefront's `next/font` faces, so each row falls back to
 * the system family matching the label.
 *
 * @param props.value - Current font-family key, or `undefined` when unset.
 * @param props.onChange - Writes the selected key back to form state.
 * @param props.placeholder - Default family shown when nothing is selected.
 * @param props.id - DOM id linking to the field-row label.
 * @returns The font-preview select control.
 */
function FontPreviewControl({ value, onChange, placeholder, id }: ControlProps) {
    const current = typeof value === 'string' ? value : undefined;

    return (
        <Select value={current} onValueChange={(next) => onChange(next)}>
            <SelectTrigger id={id}>
                <SelectValue placeholder={placeholder ?? 'Select font…'} />
            </SelectTrigger>
            <SelectContent>
                {Object.entries(FONT_FAMILIES).map(([key, label]) => (
                    <SelectItem key={key} value={key} style={{ fontFamily: label }}>
                        {label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

/** Default control per {@link ValueKind}. */
const CONTROLS: Record<ValueKind, Control> = {
    color: ColorControl,
    dimension: DimensionControl,
    number: NumberControl,
    enum: SelectControl,
    boolean: SwitchControl,
};

/**
 * Per-path control overrides, keyed by the exact catalog `path`. The two
 * typography family tokens render the font-preview select instead of the
 * generic enum control. The `accents[]` rows are NOT routed here — they are an
 * indexed array handled wholesale by the accent repeater (see
 * {@link isAccentRepeaterToken}), not as individual leaf controls.
 */
const PATH_CONTROLS: Record<string, Control> = {
    'theme.typography.fontFamily': FontPreviewControl,
    'theme.typography.headingFamily': FontPreviewControl,
};

/**
 * Resolves the control component for a leaf token: a per-path override when one
 * exists, otherwise the default for the token's `valueKind`.
 *
 * @param token - Catalog metadata for the token.
 * @returns The control component to render.
 */
export function resolveControl(token: ThemeTokenMeta): Control {
    return PATH_CONTROLS[token.path] ?? CONTROLS[token.valueKind];
}

/**
 * Reports whether a token addresses an element of the `accents[]` array (its
 * `path` carries the `[]` array marker). Such tokens are not leaf controls —
 * the accent repeater renders them as a unit — so a cluster renderer filters
 * them out of its per-token loop.
 *
 * @param token - Catalog metadata for the token.
 * @returns `true` when the token belongs to the accent repeater.
 */
export function isAccentRepeaterToken(token: ThemeTokenMeta): boolean {
    return token.path.includes('[]');
}
