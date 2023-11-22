import styles from '#/components/header.module.scss';
import Image from 'next/image';
import type { HTMLProps } from 'react';

export type PageProps = {} & Omit<HTMLProps<HTMLDivElement>, 'children'>;
export default function Container({ className, ...props }: PageProps) {
    return (
        <header {...props} className={`${styles.container} ${className || ''}`}>
            <Image
                className={`${styles.logo}`}
                src="https://nordcom.io/logo.svg"
                alt="Nordcom Group Inc.'s Logo"
                height={75}
                width={150}
                priority
            />
        </header>
    );
}
