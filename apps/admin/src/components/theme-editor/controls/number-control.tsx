import { Input } from '@/components/ui/input';
import type { ControlProps } from './field-row';

/**
 * Numeric control for `number` tokens (font weights, line clamp, opacities,
 * thresholds). Reads the optional `min`/`max`/`step` constraints from the catalog
 * metadata so font weights step 100 across 100–900 and opacities step 0.05 across
 * 0–1; tokens without constraints stay unbounded.
 *
 * @param props.token - Catalog metadata for the token, including any `min`/`max`/`step`.
 * @param props.value - Current numeric value, or `undefined` when unset.
 * @param props.onChange - Writes the parsed number (or `undefined`) back to form state.
 * @param props.placeholder - Default value shown as placeholder when unset.
 * @param props.id - DOM id linking to the field-row label.
 * @returns The number control.
 */
export function NumberControl({ token, value, onChange, placeholder, id }: ControlProps) {
    return (
        <Input
            id={id}
            type="number"
            inputMode="decimal"
            min={token.min}
            max={token.max}
            step={token.step}
            value={typeof value === 'number' ? value : ''}
            placeholder={placeholder}
            onChange={(event) => {
                const raw = event.target.value;
                onChange(raw === '' ? undefined : Number(raw));
            }}
            className="font-mono"
        />
    );
}
