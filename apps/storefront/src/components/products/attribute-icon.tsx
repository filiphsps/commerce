import { cn } from '@/utils/tailwind';
import {
    Apple as AppleIcon,
    Banana as BananaIcon,
    CakeSlice as CakeSliceIcon,
    Candy as CandyIcon,
    Carrot as CarrotIcon,
    Coffee as CoffeeIcon,
    CupSoda as CupSodaIcon,
    IceCreamCone as IceCreamConeIcon,
    Leaf as LeafIcon,
    Wine as WineIcon
} from 'lucide-react';

import type { HTMLProps } from 'react';

export type AttributeIconProps = {
    data?: string;
} & Omit<HTMLProps<SVGElement>, 'children' | 'ref'>;

/**
 * Get icon for a flavor or attribute.
 *
 * @param {string} data - The attribute/flavor to get the icon for.
 * @returns {ReactNode} The icon.
 */
export function AttributeIcon({ data = '', className, style = {}, ...props }: AttributeIconProps) {
    if (!data) {
        return null;
    }

    let Tag = null;

    // TODO: Let tenants define their own flavor icons.
    // TODO: Hire somebody to do this.
    const icon = data.toLowerCase().trim();
    switch (icon) {
        case 'apple':
            Tag = AppleIcon;
            break;
        case 'banana':
            Tag = BananaIcon;
            break;
        case 'cake':
            Tag = CakeSliceIcon;
            break;
        case 'carrot':
            Tag = CarrotIcon;
            break;
        case 'coffee':
            Tag = CoffeeIcon;
            break;
        case 'cola':
        case 'soda':
            Tag = CupSodaIcon;
            break;
        case 'ice cream':
            Tag = IceCreamConeIcon;
            break;
        case 'sweet':
            Tag = CandyIcon;
            break;
        case 'toffee':
            break; // TODO
        case 'vegan':
            Tag = LeafIcon;
            break;
        case 'wine':
            Tag = WineIcon;
            break;
    }

    if (!Tag) {
        return null;
    }

    return (
        <Tag
            data-nosnippet={true}
            className={cn('stroke-inherit', className)}
            style={{
                strokeWidth: 2.5,
                ...style
            }}
            {...props}
        />
    );
}
