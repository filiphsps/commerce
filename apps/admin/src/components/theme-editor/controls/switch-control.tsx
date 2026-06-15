import { Switch } from '@nordcom/nordstar';

import type { ControlProps } from './field-row';

/**
 * Boolean control backed by the Radix Switch wrapper. The only catalog token of
 * this kind today is `saleBadgeAllowOverlap`.
 *
 * @param props.value - Current boolean value, or `undefined` when unset.
 * @param props.onChange - Writes the boolean back to form state.
 * @param props.id - DOM id linking to the field-row label.
 * @returns The switch control.
 */
export function SwitchControl({ value, onChange, id, invalid, describedBy }: ControlProps) {
    return (
        <div className="flex h-9 items-center">
            <Switch
                id={id}
                checked={value === true}
                onCheckedChange={(next) => onChange(next)}
                aria-invalid={invalid || undefined}
                aria-describedby={describedBy}
            />
        </div>
    );
}
