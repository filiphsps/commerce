'use client';

import styles from '@/components/informational/breadcrumbs.module.scss';
import Link from '@/components/link';
import type { Shop } from '@nordcom/commerce-database';
import { usePathname } from 'next/navigation';
import { FiChevronRight } from 'react-icons/fi';

type BreadcrumbsProps = {
    shop: Shop;
    title?: string;
};
const Breadcrumbs = ({ shop, title }: BreadcrumbsProps) => {
    const route = usePathname();
    const path = route?.split('/').slice(2, -1);

    if (!path || path.length <= 0) return null;

    const hrefs = path.map((_, index) => `/${path.slice(0, index + 1).join('/')}`);
    return (
        <section className={styles.breadcrumbs} itemScope itemType="https://schema.org/BreadcrumbList">
            <div className={styles.item} itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                <Link className={styles.link} href="/" itemType="https://schema.org/Thing" itemProp="item">
                    <span itemProp="name">{shop?.name}</span>
                </Link>
                <meta itemProp="position" content="1" />
                <FiChevronRight className={styles.icon} />
            </div>
            {path?.map((entry, index) => (
                <div
                    key={entry}
                    className={styles.item}
                    itemProp="itemListElement"
                    itemScope
                    itemType="https://schema.org/ListItem"
                >
                    <Link
                        className={styles.link}
                        href={hrefs[index]!}
                        itemType="https://schema.org/Thing"
                        itemProp="item"
                    >
                        <span itemProp="name">{index === path.length - 1 ? title || entry : entry}</span>
                    </Link>
                    <meta itemProp="position" content={`${index + 2}`} />
                    {(index + 1 < path.length && <FiChevronRight className={styles.icon} />) || false}
                </div>
            ))}
        </section>
    );
};

export default Breadcrumbs;
