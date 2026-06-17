import Image from 'next/image';
import type { HTMLProps } from 'react';
import { cn } from '@/utils/tailwind';

export type AvatarProps = {
    src?: string | null;
    name?: string | null;
} & Omit<HTMLProps<HTMLDivElement>, 'name' | 'children' | 'src'>;

/**
 * Derives the avatar fallback initials from a display name: the first letter of the first and last
 * words, uppercased. Capped at two so multi-word names ("Mary Jane Watson" → "MW") never overflow the
 * fixed-size circle, and collapses runs of whitespace so stray spaces don't yield empty initials.
 *
 * @param name - The display name to derive initials from.
 * @returns One or two uppercase initials, or an empty string when `name` has no word characters.
 */
export function getInitials(name: string): string {
    const words = name.split(/\s+/).filter(Boolean);
    const first = words.at(0)?.charAt(0) ?? '';
    const last = words.length > 1 ? (words.at(-1)?.charAt(0) ?? '') : '';
    return `${first}${last}`.toUpperCase();
}
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
                    className="size-full object-cover object-center"
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
            {!src && name ? getInitials(name) : null}
        </div>
    );
}
Avatar.displayName = 'Nordcom.Avatar';
