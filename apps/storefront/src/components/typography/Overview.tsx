import styles from '@/components/typography/overview.module.scss';

import Image from 'next/image';

import { Content } from '@/components/typography/content';

import type { FunctionComponent } from 'react';

interface OverviewProps {
    body?: React.ReactNode;
    image?: {
        alt?: string;
        url: string;
        dimensions: {
            height: number;
            width: number;
        };
    };
    imageStyle?: 'normal' | 'cover';
    layout?: 'left' | 'right' | 'center';

    className?: string;
    style?: React.CSSProperties;
}
export const Overview: FunctionComponent<OverviewProps> = ({ body, image, imageStyle, layout, className, style }) => {
    if (!body) return null;

    layout = layout || 'left';
    if (!image) {
        return (
            <Content className={`${styles.content} ${styles.plain} ${styles[`align-${layout}`] || ''}`}>{body}</Content>
        );
    }

    return (
        <section
            {...(style ? { style } : {})}
            className={`${styles.container} ${styles[`align-${layout}`] || ''} ${className || ''}`}
        >
            <Image
                className={`${styles.image} ${imageStyle === 'cover' ? styles.expand : ''}`}
                src={image.url!}
                alt={image.alt!}
                width={image.dimensions.width}
                height={image.dimensions.height}
                quality={70}
                sizes="(max-width: 1150px) 250px, 250px"
                decoding="async"
            />
            <Content className={styles.content}>{body}</Content>
        </section>
    );
};
