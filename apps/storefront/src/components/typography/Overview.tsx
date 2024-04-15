import styles from '@/components/typography/overview.module.scss';

import { PrismicNextImage } from '@prismicio/next';

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
    layout?: 'left' | 'right';

    className?: string;
    style?: React.CSSProperties;
}
export const Overview: FunctionComponent<OverviewProps> = ({ body, image, imageStyle, layout, className, style }) => {
    if (!image) return <Content className={`${styles.content} ${styles.plain}`}>{body}</Content>;

    return (
        <section
            {...(style ? { style } : {})}
            className={`${styles.container} ${layout === 'right' ? styles['align-right'] : ''} ${className || ''}`}
        >
            <PrismicNextImage
                className={`${styles.image} ${imageStyle === 'cover' ? styles.expand : ''}`}
                field={image as any}
                sizes="(max-width: 1150px) 250px, 250px"
                fallbackAlt=""
                decoding="async"
            />
            <Content className={styles.content}>{body}</Content>
        </section>
    );
};
