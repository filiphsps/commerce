import styles from '@/components/HeaderNavigation/header-navigation.module.scss';
import Link from '@/components/link';
import { type FunctionComponent } from 'react';

interface HeaderNavigationProps {
    navigation: any;
}
const HeaderNavigation: FunctionComponent<HeaderNavigationProps> = ({ navigation }) => {
    return (
        <nav className={styles.navigation}>
            {navigation?.map((item: any, index: number) => {
                return (
                    <div key={item.handle + `.${index}`} className={styles.item}>
                        <Link
                            href={`/${item.handle || ''}`}
                            title={item.title}
                            /*className={
                                (route === '/' && item?.handle === null) || `/${item?.handle}` === route
                                    ? styles.active
                                    : ''
                            }*/
                        >
                            {item.title}
                        </Link>
                        {item.children.map((item: any, index: number) => (
                            <div key={item.handle + `_${index}`} className={styles['sub-item']}>
                                <Link
                                    href={`/${item.handle || ''}`}
                                    title={item.title}
                                    /*className={
                                        (route === '/' && item?.handle === null) || `/${item?.handle}` === route
                                            ? styles.active
                                            : ''
                                    }*/
                                >
                                    <div className={styles.title}>{item.title}</div>

                                    {item.description ? (
                                        <div className={styles.description}>{item.description}</div>
                                    ) : null}
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
