import { Content } from '@/components/typography/content';
import { PrismicNextImage } from '@prismicio/next';
import type { FunctionComponent } from 'react';
import styles from './overview.module.scss';

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
    style?: React.CSSProperties;
}
export const Overview: FunctionComponent<OverviewProps> = ({ body, image, imageStyle, layout, style }) => {
    if (!image) return <Content className="plain">{body}</Content>;

    return (
        <section
            {...(style ? { style } : {})}
            className={`${styles.container} ${layout === 'right' ? styles['align-right'] : ''}`}
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
