import Link from '@/components/link';
import { PrismicText } from '@/components/typography/prismic-text';
import type { Content } from '@prismicio/client';
import { asLink } from '@prismicio/client';
import type { SliceComponentProps } from '@prismicio/react';
import styles from './banner.module.scss';

/**
 * Props for `Banner`.
 */
export type BannerProps = SliceComponentProps<Content.BannerSlice>;

/**
 * Component for "Banner" Slices.
 */
const Banner = ({ slice }: BannerProps): JSX.Element => {
    // TODO: Handle other variations.
    return (
        <section
            className={styles.banner}
            data-slice-type={slice.slice_type}
            data-slice-variation={slice.variation}
            style={
                {
                    '--mixer-color': 'var(--color-bright)',
                    '--background': slice.primary.background || '#cce2cb',
                    '--heading-color': 'color-mix(in srgb, var(--background) 10%, var(--mixer-color))',
                    '--heading-selected-color': 'color-mix(in srgb, var(--accent-primary) 85%, var(--mixer-color))',
                    '--content-color': 'color-mix(in srgb, var(--background) 30%, var(--mixer-color))'
                } as React.CSSProperties
            }
        >
            <div className={styles.content}>
                <div className={styles.header}>
                    <PrismicText data={slice.primary.content} />
                </div>
                <div className={styles.actions}>
                    {slice.items.map((cta, index) => (
                        <Link
                            key={index}
                            className={styles.action}
                            data-type={cta.type ? 'primary' : 'default'}
                            href={((cta.target && asLink(cta.target)?.toString()!) || '')!} // FIXME: Handle this correctly.
                        >
                            <PrismicText data={cta.title} />
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Banner;
