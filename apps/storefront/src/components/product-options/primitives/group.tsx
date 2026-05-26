'use client';

import { useProductOptions } from '../context';
import Value from './value';

export type GroupProps = {
    name: string;
    density?: 'compact' | 'spacious';
};

const Group = ({ name, density = 'compact' }: GroupProps) => {
    const { resolved } = useProductOptions();
    const group = resolved.find((g) => g.name === name);
    if (!group) return null;

    return (
        <div
            className="product-card-swatch-row flex flex-wrap items-center gap-(--product-card-swatch-gap)"
            data-group={name}
        >
            {group.values.map((v) => (
                <span key={v.name} data-option-value>
                    <Value group={group} value={v} density={density} />
                </span>
            ))}
        </div>
    );
};

Group.displayName = 'Nordcom.ProductOptions.Group';
export default Group;
