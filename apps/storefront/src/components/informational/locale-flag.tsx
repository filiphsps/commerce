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
export const LocaleFlag = ({
    locale,
    withName = false,
    className,
    nameClassName,
    width,
    height,
    alt = locale.country,
    priority,
    suffix = null,
    ...props
}: LocaleFlagProps) => {
    let info: ReturnType<typeof countryLookup> | null = null;
    try {
        info = countryLookup(locale.country!);
    } catch {}

    return (
        <>
            <Image
                {...props}
                className={cn('block aspect-[3/2] h-2', className)}
                title={info?.country || alt}
                alt={alt! || info?.country || 'Locale flag'}
                aria-label={alt || info?.country}
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
