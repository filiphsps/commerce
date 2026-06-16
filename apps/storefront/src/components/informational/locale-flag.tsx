import { byIso as countryLookup } from 'country-code-lookup';
import Image from 'next/image';
import type { ComponentProps, ReactNode } from 'react';

import { FLAG_IMAGES_BASE_URL } from '@/utils/build-config';
import type { Locale } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

export type LocaleFlagProps = {
    locale: Locale;
    alt?: string;
    withName?: boolean;
    nameClassName?: string;
    suffix?: ReactNode;
} & Omit<ComponentProps<typeof Image>, 'src' | 'aria-label' | 'alt'>;
/**
 * Flag image with an optional country name label for a given locale.
 *
 * When `withName` is set the adjacent text already names the country, so the flag is rendered
 * decoratively (`alt=""`, `aria-hidden`) to avoid a duplicate announcement; otherwise the flag carries
 * the accessible name, defaulting to the full country name rather than the bare ISO code.
 *
 * @param props.locale - Locale providing the country code used to look up the flag and name.
 * @param props.withName - When `true`, renders the full country name next to the flag.
 * @param props.nameClassName - CSS class names applied to the country name text.
 * @param props.alt - Explicit alt text; defaults to the full country name (then the ISO code).
 * @param props.suffix - Node appended after the country name when `withName` is `true`.
 * @returns The flag image, optionally followed by the country name and suffix.
 */
export const LocaleFlag = ({
    locale,
    withName = false,
    className,
    nameClassName,
    width,
    height,
    alt,
    priority,
    suffix = null,
    ...props
}: LocaleFlagProps) => {
    let info: ReturnType<typeof countryLookup> | null = null;
    try {
        info = countryLookup(locale.country!);
    } catch {}

    const accessibleName = alt || info?.country || locale.country || 'Locale flag';
    // With the name shown as text the flag is redundant decoration; hide it from assistive tech.
    const decorative = withName && Boolean(info?.country);

    return (
        <>
            <Image
                {...props}
                className={cn('block aspect-[3/2] h-2 w-auto', className)}
                title={decorative ? undefined : accessibleName}
                alt={decorative ? '' : accessibleName}
                aria-hidden={decorative || undefined}
                aria-label={decorative ? undefined : accessibleName}
                width={width || '24'}
                height={height || '16'}
                priority={priority ?? false}
                draggable={false}
                loading={priority ? 'eager' : 'lazy'}
                decoding="async"
                src={`${FLAG_IMAGES_BASE_URL}/${locale.country}.svg`}
                unoptimized={true}
            />

            {withName && info?.country ? (
                <div className={nameClassName}>
                    {info.country}
                    {suffix}
                </div>
            ) : (
                suffix
            )}
        </>
    );
};

export type LocaleCountryNameProps = {
    locale: Locale;
};
/**
 * Returns the full country name for a locale's ISO country code.
 *
 * @param props.locale - Locale whose `country` code is looked up.
 * @returns The full country name string, or `null` when the code is unrecognized.
 */
export function LocaleCountryName({ locale }: LocaleCountryNameProps) {
    let info: ReturnType<typeof countryLookup> | null = null;
    try {
        info = countryLookup(locale.country!);
    } catch {}

    if (!info) {
        return null;
    }

    return info.country;
}
