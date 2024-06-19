import styles from '@/components/header-navigation/mega-menu.module.scss';

import { FiChevronRight } from 'react-icons/fi';

import Link from '@/components/link';
import { Content } from '@/components/typography/content';

import type { TopLevelMenuEntry } from '@/api/navigation';

export type MegaMenuProps = {
    menu?: TopLevelMenuEntry | undefined | null;
    className?: string;
};

const MegaMenu = ({ menu, className }: MegaMenuProps) => {
    if (!menu || menu.children.length <= 0) {
        return null;
    }

    return (
        <section className={`${styles.container}${className ? ` ${className}` : ''}`}>
            <div className={styles.wrapper}>
                <section className={styles.menu}>
                    {/*<Image
                            className={styles.banner}
                            {...(banner ? banner : logo)}
                            sizes="(max-width: 1024px) 125px, 175px"
                            draggable={false}
                            priority={true}
                            loading="eager"
                            decoding="async"
                        />*/}

                    {(menu.children || []).map((menu, index) => {
                        const { id, title, url } = menu;

                        const label = (
                            <>
                                {title} {menu.children.length > 0 ? <FiChevronRight /> : null}
                            </>
                        );

                        return (
                            <div key={`${id}_${index}`} className={styles.entry}>
                                {url ? (
                                    <Link className={styles.link} href={url}>
                                        {label}
                                    </Link>
                                ) : (
                                    <span className={styles.link}>{label}</span>
                                )}

                                <nav className={`${styles.index}`}>
                                    {[...menu.children, ...menu.children, ...menu.children].map(
                                        ({ id, url, title, description }, index) => (
                                            <Link key={`${id}_${index}`} className={styles.link} href={url || '#'}>
                                                {title}
                                                {description ? (
                                                    <Content className={styles.description}>{description}</Content>
                                                ) : null}
                                            </Link>
                                        )
                                    )}
                                </nav>
                            </div>
                        );
                    })}
                </section>
            </div>
        </section>
    );
};
MegaMenu.displayName = 'Nordcom.Header.MegaMenu';

export default MegaMenu;
