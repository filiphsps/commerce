'use client';

import styles from '@/components/header/header-navigation.module.scss';

import { FiChevronDown } from 'react-icons/fi';
import { usePathname } from 'next/navigation';

import Link from '@/components/link';

import type { NavigationItem } from '@/api/navigation';
import type { Locale } from '@/utils/locale';
import type { ReactNode } from 'react';

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
                href={`/${data.handle || ''}`}
                title={data.title}
                className={`${styles.top} ${
                    (route === '/' && data.handle === null) || `/${data.handle}` === route ? styles.active : ''
                }`}
            >
                {data.title || null}
                {(data.children.length > 0 && <FiChevronDown />) || null}
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
export const SubMenuItem = ({ children, data: { handle, title, description }, locale }: SubMenuItemProps) => {
    const route = usePathname().replace(`/${locale.code}`, '');
    let target: string = handle || '/';

    if (!target.startsWith('/') || target === '') target = `/${target}`;
    if (target.length !== 1 && target.endsWith('/')) target = target.slice(0, -1);

    const url = `/${handle || ''}`;
    const desc = !!description ? <div className={styles.description}>{description}</div> : null;

    return (
        <div className={`${styles.subitem} ${(target === route && styles.active) || ''}`}>
            <Link href={url || '#'} title={title}>
                <div className={styles.title}>{title}</div>
                {desc}
            </Link>
            {children}
        </div>
    );
};
