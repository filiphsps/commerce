import styles from '@/components/informational/current-locale-flag.module.scss';
import type { Locale } from '@/utils/locale';
import Image from 'next/image';
import type { ComponentProps } from 'react';

export type CurrentLocaleFlagProps = {
    locale: Locale;
    alt?: string;
} & Omit<ComponentProps<typeof Image>, 'src' | 'aria-label' | 'alt'>;
export const CurrentLocaleFlag = ({
    locale,
    className,
    priority,
    width,
    height,
    alt = locale.country,
    ...props
}: CurrentLocaleFlagProps) => {
    return (
        <Image
            {...props}
            className={`${styles.flag} ${className}`}
            alt={alt}
            aria-label={alt}
            width={width || '24'}
            height={height || '16'}
            priority={priority !== undefined ? priority : true}
            // TODO: Don't hardcode to some random github pages repo.
            src={`https://purecatamphetamine.github.io/country-flag-icons/3x2/${locale.country}.svg`}
        />
    );
};
