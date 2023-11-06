import type { HTMLProps, ReactNode } from 'react';

import { FiChevronDown } from 'react-icons/fi';
import Link from '@/components/link';
import { RemoveInvalidProps } from '@/utils/remove-invalid-props';
import styles from '@/components/Header/header-navigation.module.scss';

type HeaderNavigationItemProps = {
    children?: ReactNode;
} & HTMLProps<HTMLDivElement>;
export const HeaderNavigationItem = (props: HeaderNavigationItemProps) => {
    return <div {...props} className={`${styles.item} ${props.className || ''}`} />;
};

type HeaderNavigationChildItemsProps = {
    children?: ReactNode;
} & HTMLProps<HTMLDivElement>;
export const HeaderNavigationChildItems = (props: HeaderNavigationChildItemsProps) => {
    return <div {...props} className={`${styles.submenu} ${props.className || ''}`} />;
};

type HeaderNavigationChildItemProps = {
    children?: ReactNode;
} & HTMLProps<HTMLDivElement>;
export const HeaderNavigationChildItem = (props: HeaderNavigationChildItemProps) => {
    return <div {...props} className={`${styles.subitem} ${props.className || ''}`} />;
};

type HeaderNavigationProps = {
    children?: ReactNode;
    route?: string;
    menu: any;
} & HTMLProps<HTMLDivElement>;
export const HeaderNavigation = (props: HeaderNavigationProps) => {
    const { menu, route } = props;

    return (
        <nav {...RemoveInvalidProps(props)} className={`${styles.container} ${props.className || ''}`}>
            {menu?.map?.((item: any, index: number) => {
                return (
                    <HeaderNavigationItem key={item.handle + `${index}`}>
                        <Link
                            href={`/${item?.handle || ''}`}
                            title={item.title}
                            className={`${styles.top} ${
                                (route === '/' && item?.handle === null) || `/${item?.handle}` === route ? 'Active' : ''
                            }`}
                            prefetch={false}
                        >
                            {item?.title || null}
                            {(item?.children?.length > 0 && <FiChevronDown />) || null}
                        </Link>
                        {item.children.length > 0 && (
                            <HeaderNavigationChildItems>
                                <div className={styles.content}>
                                    {item.children.map((item: any, index: number) => (
                                        <HeaderNavigationChildItem
                                            key={item.handle + `${index}`}
                                            className={
                                                (((route === '/' && item?.handle === null) ||
                                                    `/${item?.handle}` === route) &&
                                                    styles.active) ||
                                                ''
                                            }
                                        >
                                            <Link href={`/${item?.handle || ''}`} title={item.title} prefetch={false}>
                                                <div className={styles.title}>{item.title}</div>
                                                {item.description && (
                                                    <div className={styles.description}>{item.description}</div>
                                                )}
                                            </Link>
                                        </HeaderNavigationChildItem>
                                    ))}
                                </div>
                            </HeaderNavigationChildItems>
                        )}
                    </HeaderNavigationItem>
                );
            })}
        </nav>
    );
};
