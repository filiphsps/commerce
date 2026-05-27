'use client';

import { useCallback } from 'react';
import { useProductOptions } from '../context';
import { pickBuiltin } from '../renderers';
import type { ResolvedOption, ResolvedOptionValue } from '../types';

export type ValueProps = {
    group: ResolvedOption;
    value: ResolvedOptionValue;
    density?: 'compact' | 'spacious';
};

/**
 * Dispatches to the appropriate renderer for a single option value based on the group name and value type.
 *
 * @param props.group - Resolved option group providing name and renderer lookup key.
 * @param props.value - Resolved option value passed to the selected renderer.
 * @param props.density - Visual density forwarded to the renderer.
 * @returns The renderer element for this option value.
 */
const Value = ({ group, value, density = 'compact' }: ValueProps) => {
    const { selection, selectVariant, renderers } = useProductOptions();
    const onSelect = useCallback(() => {
        selectVariant({ ...selection, [group.name]: value.name });
    }, [group.name, value.name, selection, selectVariant]);

    const Renderer = renderers[group.name.toLowerCase()] ?? pickBuiltin(group, value);
    return <Renderer group={group} value={value} onSelect={onSelect} density={density} />;
};

Value.displayName = 'Nordcom.ProductOptions.Value';
export default Value;
