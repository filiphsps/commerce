import { byIso as countryLookup } from 'country-code-lookup';
import Image from 'next/image';
import type { ComponentProps } from 'react';

import { FLAG_IMAGES_BASE_URL } from '@/utils/build-config';
import type { Locale } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

export type CurrentLocaleFlagProps = {
    locale: Locale;
    alt?: string;
} & Omit<ComponentProps<typeof Image>, 'src' | 'aria-label' | 'alt'>;
/**
 * Flag image for the currently active locale.
 *
 * @param props.locale - Active locale whose `country` code determines the flag SVG.
 * @param props.alt - Explicit alt text; defaults to the full country name (then the ISO code).
 * @param props.className - Additional CSS class names.
 * @returns The flag image element.
 */
export const CurrentLocaleFlag = ({ locale, className, width, height, alt, ...props }: CurrentLocaleFlagProps) => {
    let info: ReturnType<typeof countryLookup> | null = null;
    try {
        info = countryLookup(locale.country!);
    } catch {}

    const accessibleName = alt || info?.country || locale.country || 'Locale flag';

    return (
        <Image
            {...props}
            className={cn('aspect-[3/2] h-full max-h-8 w-auto overflow-hidden object-contain object-center', className)}
            alt={accessibleName}
            aria-label={accessibleName}
            width={width || '24'}
            height={height || '16'}
            priority={false}
            loading="lazy"
            decoding="async"
            draggable={false}
            src={`${FLAG_IMAGES_BASE_URL}/${locale.country}.svg`}
        />
    );
};
