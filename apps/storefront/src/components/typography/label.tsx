import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import type { ElementType, HTMLProps, ReactNode } from 'react';

export type LabelProps = {
    children: ReactNode;
    as?: ElementType;
} & HTMLProps<HTMLLabelElement>;
export const Label = ({ children, as, className, ...props }: LabelProps) => {
    if (!children) return null;

    const AsComponent = as || 'label';

    return (
        <AsComponent
            {...props}
            className={twMerge(clsx('block text-sm font-extrabold uppercase leading-tight', className))}
        >
            {children}
        </AsComponent>
    );
};
