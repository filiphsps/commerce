import Image from 'next/image';

import { cn } from '@/utils/tailwind';
import { byIso as countryLookup } from 'country-code-lookup';

import type { Locale } from '@/utils/locale';
import type { ComponentProps } from 'react';

export type LocaleFlagProps = {
    locale: Locale;
    alt?: string;
    withName?: boolean;
    nameClassName?: string;
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
                // TODO: Don't hardcode to some random github pages repo.
                src={`https://purecatamphetamine.github.io/country-flag-icons/3x2/${locale.country}.svg`}
            />
            {withName && info?.country ? <div className={nameClassName}>{info.country}</div> : null}
        </>
    );
};
