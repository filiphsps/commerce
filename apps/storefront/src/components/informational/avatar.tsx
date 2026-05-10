import Image from 'next/image';
import type { HTMLProps } from 'react';
import { cn } from '@/utils/tailwind';

export type AvatarProps = {
    src?: string | null;
    name?: string | null;
} & Omit<HTMLProps<HTMLDivElement>, 'name' | 'children' | 'src'>;
export async function Avatar({ src, name, title, className, ...props }: AvatarProps) {
    if (!src && !name) {
        console.warn(`No src or fallback name was provided to <${Avatar.displayName}/>, returning null.`);
        return null;
    }

    return (
        <div
            {...props}
            title={title || name || undefined}
            className={cn(
                'flex size-8 items-center justify-center overflow-hidden rounded-full bg-gray-200 font-bold text-gray-600 shadow',
                className,
            )}
        >
            {src ? (
                <Image
                    className={cn('h-full w-full object-cover object-center', className)}
                    role="presentation"
                    alt=""
                    width={45}
                    height={45}
                    src={src}
                    draggable={false}
                    decoding="async"
                    loading="eager"
                    fetchPriority="auto"
                />
            ) : null}
            {!src && name
                ? name
                      .split(' ')
                      .map((_) => _.slice(0, 1).toUpperCase())
                      .join('')
                : null}
        </div>
    );
}
Avatar.displayName = 'Nordcom.Avatar';
