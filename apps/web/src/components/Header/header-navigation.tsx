import type { HTMLProps, ReactNode } from 'react';

import styles from '@/components/Header/header-navigation.module.scss';
import type { Locale } from '@/utils/locale';
import { RemoveInvalidProps } from '@/utils/remove-invalid-props';
import { MenuItem, SubMenuItem } from './menu-item';

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
export const HeaderNavigation = (props: HeaderNavigationProps) => {
    const { menu, locale } = props;

    return (
        <nav {...RemoveInvalidProps(props)} className={`${styles.container} ${props.className || ''}`}>
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
