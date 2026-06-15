import { Input } from '@/components/ui/input';
import type { ControlProps } from './field-row';

/**
 * Free-text dimension control for any CSS string token (rem/px/%/aspect like
 * `4 / 5`/shadow lists/durations). Quoted-content tokens (`imageSizes`,
 * `ctaPillIcon`, …) are plain text here too — the serializer adds CSS quotes on
 * emit, so the stored value stays unquoted.
 *
 * @param props.token - Catalog metadata for the token.
 * @param props.value - Current raw string, or `undefined` when unset.
 * @param props.onChange - Writes the raw string back to form state.
 * @param props.placeholder - Default value shown as placeholder when unset.
 * @param props.id - DOM id linking to the field-row label.
 * @returns The dimension control.
 */
export function DimensionControl({ value, onChange, placeholder, id }: ControlProps) {
    return (
        <Input
            id={id}
            type="text"
            spellCheck={false}
            value={typeof value === 'string' ? value : ''}
            placeholder={placeholder}
            onChange={(event) => onChange(event.target.value)}
            className="font-mono"
        />
    );
}
