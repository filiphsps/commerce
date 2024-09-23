import { cn } from '@/utils/tailwind';
import Image from 'next/image';

import type { Locale } from '@/utils/locale';
import type { ComponentProps } from 'react';

export type CurrentLocaleFlagProps = {
    locale: Locale;
    alt?: string;
} & Omit<ComponentProps<typeof Image>, 'src' | 'aria-label' | 'alt'>;
export const CurrentLocaleFlag = ({
    locale,
    className,
    width,
    height,
    alt = locale.country,
    ...props
}: CurrentLocaleFlagProps) => {
    return (
        <Image
            {...props}
            className={cn('aspect-[3/2] h-full max-h-8 w-auto overflow-hidden object-contain object-center', className)}
            alt={alt!}
            aria-label={alt}
            width={width || '24'}
            height={height || '16'}
            priority={false}
            loading="lazy"
            decoding="async"
            draggable={false}
            // TODO: Don't hardcode to some random github pages repo.
            src={`https://purecatamphetamine.github.io/country-flag-icons/3x2/${locale.country}.svg`}
        />
    );
};
