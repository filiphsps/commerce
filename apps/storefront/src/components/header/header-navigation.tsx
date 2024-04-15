import styles from '@/components/header/header-navigation.module.scss';

import { MenuItem, SubMenuItem } from '@/components/header/menu-item';

import type { Locale } from '@/utils/locale';
import type { HTMLProps, ReactNode } from 'react';

type HeaderNavigationChildItemsProps = {
    children?: ReactNode;
} & HTMLProps<HTMLDivElement>;
export const HeaderNavigationChildItems = (props: HeaderNavigationChildItemsProps) => {
    return <div {...props} className={`${styles.submenu} ${props.className || ''}`} />;
};

type HeaderNavigationProps = {
    children?: ReactNode;
    menu: any;
    locale: Locale;
} & HTMLProps<HTMLDivElement>;
export const HeaderNavigation = ({ locale, menu, className, ...props }: HeaderNavigationProps) => {
    return (
        <nav {...props} className={`${styles.container} ${styles.centered} ${className || ''}`}>
            {menu?.map?.((item: any, index: number) => {
                return (
                    <MenuItem key={item.handle + `${index}`} data={item} locale={locale}>
                        {item.children.length > 0 && (
                            <HeaderNavigationChildItems>
                                <div className={styles.content}>
                                    {item.children.map((item: any, index: number) => (
                                        <SubMenuItem key={item.handle + `${index}`} data={item} locale={locale} />
                                    ))}
                                </div>
                            </HeaderNavigationChildItems>
                        )}
                    </MenuItem>
                );
            })}
        </nav>
    );
};
