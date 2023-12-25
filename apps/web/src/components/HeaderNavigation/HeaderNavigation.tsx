'use client';

import styles from '@/components/HeaderNavigation/header-navigation.module.scss';
import Link from '@/components/link';
import { usePathname } from 'next/navigation';
import type { FunctionComponent } from 'react';

interface HeaderNavigationProps {
    navigation: any;
}
const HeaderNavigation: FunctionComponent<HeaderNavigationProps> = ({ navigation }) => {
    const route = usePathname();

    return (
        <nav className={styles.navigation}>
            {navigation?.map((item: any, index: number) => {
                return (
                    <div key={item.handle + `_${index}`} className={styles.item}>
                        <Link
                            href={`/${item.handle || ''}`}
                            title={item.title}
                            className={
                                (route === '/' && item?.handle === null) || `/${item?.handle}` === route
                                    ? styles.active
                                    : ''
                            }
                            onClick={() => document.body.removeAttribute('data-menu-open')}
                        >
                            {item.title}
                        </Link>
                        {item.children.map((item: any, index: number) => (
                            <div key={item.handle + `_${index}`} className={styles['sub-item']}>
                                <Link
                                    href={`/${item.handle || ''}`}
                                    title={item.title}
                                    className={
                                        (route === '/' && item?.handle === null) || `/${item?.handle}` === route
                                            ? styles.active
                                            : ''
                                    }
                                    onClick={() => document.body.removeAttribute('data-menu-open')}
                                >
                                    <div className={styles.title}>{item.title}</div>

                                    {item.description && <div className={styles.description}>{item.description}</div>}
                                </Link>
                            </div>
                        ))}
                    </div>
                );
            })}
        </nav>
    );
};

export default HeaderNavigation;
