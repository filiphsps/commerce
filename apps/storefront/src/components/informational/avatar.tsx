import Image from 'next/image';
import type { HTMLProps } from 'react';
import { cn } from '@/utils/tailwind';

export type AvatarProps = {
    src?: string | null;
    name?: string | null;
} & Omit<HTMLProps<HTMLDivElement>, 'name' | 'children' | 'src'>;
/**
 * Circular avatar showing a profile image when available, otherwise initials derived from `name`.
 *
 * @param props.src - URL of the profile image; initials are shown when absent.
 * @param props.name - Display name used for the `title` attribute and initials fallback.
 * @param props.className - Additional CSS class names.
 * @returns The avatar element, or `null` when both `src` and `name` are absent.
 */
export async function Avatar({ src, name, title, className, ...props }: AvatarProps) {
    if (!src && !name) {
        return null;
    }

    return (
        <div
            {...props}
            title={title || name || undefined}
            className={cn(
                'flex size-8 items-center justify-center overflow-hidden rounded-full bg-(--surface-1) font-bold text-(--text-muted) shadow',
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
