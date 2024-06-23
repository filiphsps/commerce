import styles from '@/components/header/header-navigation.module.scss';

import { FiChevronDown } from 'react-icons/fi';

import Link from '@/components/link';

import type { NavigationItem } from '@/api/navigation';
import type { ReactNode } from 'react';

export type MenuItemProps = {
    children?: ReactNode;
    data: NavigationItem;
};
export const MenuItem = ({ data, children }: MenuItemProps) => {
    let target: string = data.handle || '/';

    if (!target.startsWith('/') || target === '') target = `/${target}`;
    if (target.length !== 1 && target.endsWith('/')) target = target.slice(0, -1);

    return (
        <div className={styles.item}>
            <Link href={`/${data.handle || ''}`} title={data.title} className={styles.top}>
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
};
export const SubMenuItem = ({ children, data: { handle, title, description } }: SubMenuItemProps) => {
    let target: string = handle || '/';

    if (!target.startsWith('/') || target === '') target = `/${target}`;
    if (target.length !== 1 && target.endsWith('/')) target = target.slice(0, -1);

    const url = `/${handle || ''}`;
    const desc = !!description ? <div className={styles.description}>{description}</div> : null;

    return (
        <div className={styles.subitem}>
            <Link href={url || '#'} title={title}>
                <div className={styles.title}>{title}</div>
                {desc}
            </Link>

            {children}
        </div>
    );
};
