import { LuApple, LuBanana, LuCoffee, LuIceCream } from 'react-icons/lu';
import { PiPlant } from 'react-icons/pi';

import { cn } from '@/utils/tailwind';

import type { HTMLProps } from 'react';

export type AttributeIconProps = {
    data?: string;
} & Omit<HTMLProps<SVGElement>, 'children'>;

/**
 * Get icon for a flavor or attribute.
 *
 * @param {string} data - The attribute/flavor to get the icon for.
 * @returns {ReactNode} The icon.
 */
export function AttributeIcon({ data = '', className, style = {}, ...props }: AttributeIconProps) {
    let Tag = null;

    // TODO: Let tenants define their own flavor icons.
    // TODO: Hire somebody to do this.
    const icon = data.toLowerCase().trim();
    switch (icon) {
        case 'banana':
            Tag = LuBanana;
            break;
        case 'coffee':
            Tag = LuCoffee;
            break;
        case 'apple':
            Tag = LuApple;
            break;
        case 'ice cream':
            Tag = LuIceCream;
            break;
        case 'toffee':
            return null; // TODO
        case 'vegan':
            Tag = PiPlant; // TODO
            break;
    }

    if (!Tag) return null;
    return (
        <Tag
            data-nosnippet={true}
            className={cn('stroke-inherit', className)}
            style={{
                strokeWidth: 3.5,
                ...style
            }}
            {...props}
        />
    );
}
