import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ControlProps } from './field-row';

/**
 * Enum control backed by the Radix Select wrapper. Options come from the
 * token's `enumValues`; a single-option enum (`quickAddPresentation`,
 * `saleStyle`, `saleBadgeStyle`) renders disabled/read-only since there is
 * nothing to choose. The font-family enums are handled by a per-path override
 * in the registry, not here.
 *
 * @param props.token - Catalog metadata supplying `enumValues`.
 * @param props.value - Current selected value, or `undefined` when unset.
 * @param props.onChange - Writes the selected string back to form state.
 * @param props.placeholder - Default value shown when nothing is selected.
 * @param props.id - DOM id linking to the field-row label.
 * @returns The select control.
 */
export function SelectControl({ token, value, onChange, placeholder, id }: ControlProps) {
    const options = token.enumValues ?? [];
    const readOnly = options.length <= 1;
    const current = typeof value === 'string' ? value : undefined;

    return (
        <Select value={current} onValueChange={(next) => onChange(next)} disabled={readOnly}>
            <SelectTrigger id={id}>
                <SelectValue placeholder={placeholder ?? 'Select…'} />
            </SelectTrigger>
            <SelectContent>
                {options.map((option) => (
                    <SelectItem key={option} value={option}>
                        {option}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
