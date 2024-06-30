import styles from '@/components/header/header-navigation.module.scss';

import { cn } from '@/utils/tailwind';

import { MenuItem, SubMenuItem } from '@/components/header/menu-item';

import type { NavigationItem } from '@/api/navigation';
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
    menu: NavigationItem[];
    locale: Locale;
} & HTMLProps<HTMLDivElement>;
export const HeaderNavigation = ({ menu, className, ...props }: HeaderNavigationProps) => {
    return (
        <nav {...props} className={cn(styles.container, styles.centered, className)}>
            {menu.map((item, index: number) => {
                return (
                    <MenuItem key={item.handle + `${index}`} data={item}>
                        {item.children.length > 0 && (
                            <HeaderNavigationChildItems>
                                <div className={styles.content}>
                                    {item.children.map((item, index: number) => (
                                        <SubMenuItem key={item.handle + `${index}`} data={item} />
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
