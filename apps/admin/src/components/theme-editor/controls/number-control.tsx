import { cn } from '@/utils/tailwind';
import type { ControlProps } from './field-row';

/** Shared numeric-input styling, matching the dimension control. */
const INPUT_CLASS =
    'flex h-9 w-full rounded-md border-2 border-border bg-background px-3 py-1 font-mono text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50';

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
        <input
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
            className={cn(INPUT_CLASS)}
        />
    );
}
