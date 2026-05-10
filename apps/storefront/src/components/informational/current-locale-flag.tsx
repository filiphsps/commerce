import Image from 'next/image';
import type { ComponentProps } from 'react';

import { FLAG_IMAGES_BASE_URL } from '@/utils/build-config';
import type { Locale } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

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
            src={`${FLAG_IMAGES_BASE_URL}/${locale.country}.svg`}
        />
    );
};
