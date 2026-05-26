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
