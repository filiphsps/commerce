import PageContent from '@/components/page-content';
import type { Content } from '@prismicio/client';
import type { SliceComponentProps } from '@prismicio/react';
import Image from 'next/image';
import styles from './icon-grid.module.scss';

/**
 * Props for `IconGrid`.
 */
export type IconGridProps = SliceComponentProps<Content.IconGridSlice>;

/**
 * Component for "IconGrid" Slices.
 */
const IconGrid = ({ slice }: IconGridProps): JSX.Element => {
    return (
        <section className={styles.container} data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
            <PageContent>
                <div className={styles.content}>
                    {slice.items.map((item, index) => (
                        <div key={index} className={styles.item}>
                            <div className={styles.icon}>
                                {item.icon?.url && (
                                    <Image src={item.icon.url} alt={item.icon.alt || ''} width={35} height={35} />
                                )}
                            </div>
                            <div className={styles.title}>{item.title}</div>
                        </div>
                    ))}
                </div>
            </PageContent>
        </section>
    );
};

export default IconGrid;
