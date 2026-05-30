import { cn } from '@/utils/tailwind';
import type { ControlProps } from './field-row';

/** Shared text-input styling, matching the color field's text input. */
const INPUT_CLASS =
    'flex h-9 w-full rounded-md border-2 border-border bg-background px-3 py-1 font-mono text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50';

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
        <input
            id={id}
            type="text"
            spellCheck={false}
            value={typeof value === 'string' ? value : ''}
            placeholder={placeholder}
            onChange={(event) => onChange(event.target.value)}
            className={cn(INPUT_CLASS)}
        />
    );
}
