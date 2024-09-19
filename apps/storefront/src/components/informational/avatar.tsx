import { cn } from '@/utils/tailwind';

import type { HTMLProps, ReactNode } from 'react';

export type AvatarProps = {
    src?: string;
    children?: ReactNode;
} & HTMLProps<HTMLDivElement>;
export async function Avatar({ src, children, className, ...props }: AvatarProps) {
    const content = children ? (
        children
    ) : (
        <img
            role="presentation"
            width={25}
            height={25}
            src={src}
            className={cn('h-full w-full object-cover object-center', className)}
        />
    );

    return (
        <div {...props} className={cn('size-12 rounded-full bg-gray-100', className)}>
            {content}
        </div>
    );
}
Avatar.displayName = 'Nordcom.Avatar';
