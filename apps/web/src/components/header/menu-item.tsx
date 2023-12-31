'use client';

import type { NavigationItem } from '@/api/navigation';
import styles from '@/components/header/header-navigation.module.scss';
import Link from '@/components/link';
import type { Locale } from '@/utils/locale';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { FiChevronDown } from 'react-icons/fi';

export type MenuItemProps = {
    children?: ReactNode;
    data: NavigationItem;
    locale: Locale;
};
export const MenuItem = ({ data, locale, children }: MenuItemProps) => {
    const route = usePathname().replace(`/${locale.code}`, '');
    let target: string = data.handle || '/';

    if (!target.startsWith('/') || target === '') target = `/${target}`;
    if (target.length !== 1 && target.endsWith('/')) target = target.slice(0, -1);

    return (
        <div className={`${styles.item} ${(target === route && styles.active) || ''}`}>
            <Link
                href={`/${data?.handle || ''}`}
                title={data.title}
                className={`${styles.top} ${
                    (route === '/' && data?.handle === null) || `/${data?.handle}` === route ? styles.active : ''
                }`}
            >
                {data?.title || null}
                {(data?.children?.length > 0 && <FiChevronDown />) || null}
            </Link>
            {children}
        </div>
    );
};

export type SubMenuItemProps = {
    children?: ReactNode;
    data: NavigationItem;
    locale: Locale;
};
export const SubMenuItem = ({ children, data, locale }: SubMenuItemProps) => {
    const route = usePathname().replace(`/${locale.code}`, '');
    let target: string = data.handle || '/';

    if (!target.startsWith('/') || target === '') target = `/${target}`;
    if (target.length !== 1 && target.endsWith('/')) target = target.slice(0, -1);

    return (
        <div className={`${styles.subitem} ${(target === route && styles.active) || ''}`}>
            <Link href={`/${data?.handle || ''}`} title={data.title}>
                <div className={styles.title}>{data.title}</div>
                {data.description && <div className={styles.description}>{data.description}</div>}
            </Link>
            {children}
        </div>
    );
};
