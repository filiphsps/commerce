import { cn } from '@/utils/tailwind';

import type { ElementType, HTMLProps, ReactNode } from 'react';

export type ContentProps = {
    children?: ReactNode;
    as?: ElementType;
} & HTMLProps<HTMLDivElement>;
export const Content = ({ children, as, className, ...props }: ContentProps) => {
    const AsComponent = as || 'div';

    return (
        <AsComponent {...props} className={cn('prose', className)}>
            {children}
        </AsComponent>
    );
};
