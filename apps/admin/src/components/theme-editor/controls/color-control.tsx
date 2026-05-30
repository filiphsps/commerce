import { ColorField } from '@/components/ui/color-field';
import type { ControlProps } from './field-row';

/**
 * Color leaf control. Wraps the {@link ColorField} primitive (swatch + raw CSS
 * text), writing the verbatim string so non-hex tokens (`var(--accent)`,
 * `currentColor`) survive a round-trip.
 *
 * @param props.token - Catalog metadata for the token.
 * @param props.value - Current raw color string, or `undefined` when unset.
 * @param props.onChange - Writes the raw string back to form state.
 * @param props.placeholder - Default value shown as placeholder when unset.
 * @param props.id - DOM id linking to the field-row label.
 * @returns The color control.
 */
export function ColorControl({ value, onChange, placeholder, id }: ControlProps) {
    return (
        <ColorField
            id={id}
            value={typeof value === 'string' ? value : ''}
            placeholder={placeholder}
            onChange={(next) => onChange(next)}
        />
    );
}
