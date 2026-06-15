'use client';

import { colord } from 'colord';
import { type ComponentPropsWithoutRef, forwardRef } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/utils/tailwind';

/**
 * Resolve a CSS color string to the 6-digit hex the native `<input type="color">`
 * can display. Returns null when the value is not a parseable color — empty
 * strings, CSS keywords like `currentColor`, and `var(...)` references all fall
 * through to a neutral swatch rather than a misleading black chip.
 *
 * @param value - Raw CSS color string held by the field.
 * @returns A `#rrggbb` string when parseable, otherwise null.
 */
function toSwatchHex(value: string): string | null {
    const parsed = colord(value);
    if (!parsed.isValid()) {
        return null;
    }
    return parsed.toHex().slice(0, 7);
}

export type ColorFieldProps = Omit<ComponentPropsWithoutRef<'input'>, 'onChange' | 'type' | 'value'> & {
    /** Current raw CSS color string (hex, `var(...)`, `currentColor`, …). */
    value: string;
    /** Called with the raw string on swatch pick or text edit; omit for read-only display. */
    onChange?: (value: string) => void;
};

/**
 * Color field pairing a native `<input type="color">` swatch with a free-text
 * input, two-way synced. The text input is the source of truth and stores the
 * raw string verbatim so non-hex CSS tokens (`var(--accent)`, `currentColor`)
 * survive a round-trip; the swatch only reflects/edits values `colord` can parse
 * as hex and goes neutral and disabled otherwise.
 *
 * @param props.value - Current raw CSS color string.
 * @param props.onChange - Raw-string change handler; omit to render read-only.
 * @param props.disabled - Disables both the swatch and the text input.
 * @param props.className - Additional class names merged onto the wrapper.
 * @param props.id - Forwarded to the text input for label association.
 */
export const ColorField = forwardRef<HTMLInputElement, ColorFieldProps>(
    ({ value, onChange, disabled, className, id, ...props }, ref) => {
        const swatchHex = toSwatchHex(value);

        return (
            <div className={cn('flex items-center gap-2', className)}>
                <span className="relative inline-flex h-9 w-9 shrink-0 overflow-hidden rounded-md border-2 border-border">
                    {swatchHex !== null ? (
                        <input
                            type="color"
                            aria-label="Color swatch"
                            value={swatchHex}
                            disabled={disabled}
                            onChange={(event) => onChange?.(event.target.value)}
                            className="absolute -inset-1 h-[calc(100%+0.5rem)] w-[calc(100%+0.5rem)] cursor-pointer bg-transparent disabled:cursor-not-allowed"
                        />
                    ) : (
                        <span
                            aria-hidden="true"
                            className="h-full w-full bg-muted"
                            style={{
                                backgroundImage:
                                    'linear-gradient(to top right, transparent calc(50% - 1px), var(--border), transparent calc(50% + 1px))',
                            }}
                        />
                    )}
                </span>
                <Input
                    ref={ref}
                    type="text"
                    id={id}
                    value={value}
                    disabled={disabled}
                    spellCheck={false}
                    onChange={(event) => onChange?.(event.target.value)}
                    className="font-mono"
                    {...props}
                />
            </div>
        );
    },
);
ColorField.displayName = 'ColorField';
