import { LuApple, LuBanana, LuCakeSlice, LuCandy, LuCarrot, LuCoffee, LuIceCream, LuWine } from 'react-icons/lu';
import { PiBeerBottleBold, PiPlant } from 'react-icons/pi';
import { TbMelon, TbSalt } from 'react-icons/tb';

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
        case 'apple':
            Tag = LuApple;
            break;
        case 'banana':
            Tag = LuBanana;
            break;
        case 'cake':
            Tag = LuCakeSlice;
            break;
        case 'carrot':
            Tag = LuCarrot;
            break;
        case 'coffee':
            Tag = LuCoffee;
            break;
        case 'cola':
        case 'soda':
            Tag = PiBeerBottleBold;
            break;
        case 'watermelon':
        case 'melon':
            Tag = TbMelon;
            break;
        case 'ice cream':
            Tag = LuIceCream;
            break;
        case 'salt':
            Tag = TbSalt;
        case 'sweet':
            Tag = LuCandy;
            break;
        case 'toffee':
            break; // TODO
        case 'vegan':
            Tag = PiPlant;
            break;
        case 'wine':
            Tag = LuWine;
            break;
    }

    if (!Tag) return null;
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
