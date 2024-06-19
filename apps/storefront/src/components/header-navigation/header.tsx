import 'server-only';

import styles from '@/components/header-navigation/header.module.scss';

import { FiChevronDown } from 'react-icons/fi';
import Image from 'next/image';

import type { OnlineShop } from '@nordcom/commerce-db';

import { CartButton } from '@/components/header/cart-button';
import MegaMenu from '@/components/header-navigation/mega-menu';
import Link from '@/components/link';

import type { MegaMenuBase } from '@/api/navigation';
import type { Locale, LocaleDictionary } from '@/utils/locale';

const menu: MegaMenuBase = {
    children: [
        {
            id: 'shop',
            title: 'Shop',
            url: '/collections/all/',
            children: [
                {
                    id: 'shop.all-products',
                    title: 'All Products',
                    image: {
                        alt: 'Classical Swedish Candy',
                        src: 'https://cdn.shopify.com/s/files/1/0585/6890/0706/files/losvikt.png?v=1718860451',
                        width: 256,
                        height: 256
                    },
                    children: [
                        {
                            id: 'shop.all-products.ahlgrens-bilar',
                            title: 'Ahlgrens Bilar',
                            description: "Sweden's most sold car, the famous brand behind the car-shaped candy.",
                            url: '/collections/ahlgrens-bilar/'
                        },
                        {
                            id: 'shop.all-products.gott-och-blandat',
                            title: 'Gott & Blandat',
                            description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
                            url: '/collections/ahlgrens-bilar/'
                        },
                        {
                            id: 'shop.all-products.gott-och-blandat',
                            title: 'Gott & Blandat',
                            description: 'sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
                            url: '/collections/ahlgrens-bilar/'
                        },
                        {
                            id: 'shop.all-products.gott-och-blandat',
                            title: 'Gott & Blandat',
                            description: 'Ut minim veniam, quis nostrud  ullamco laboris ut aliquip commodo consequat.',
                            url: '/collections/ahlgrens-bilar/'
                        }
                    ]
                },
                {
                    id: 'shop.swedish-candy',
                    title: 'Sweets & Candy',
                    image: {
                        alt: 'Classical Swedish Candy',
                        src: 'https://cdn.shopify.com/s/files/1/0585/6890/0706/files/losvikt.png?v=1718860451',
                        width: 256,
                        height: 256
                    },
                    children: [
                        {
                            id: 'shop.swedish-candy.ahlgrens-bilar',
                            title: 'Ahlgrens Bilar',
                            description: "Sweden's most sold car, the famous brand behind the car-shaped candy.",
                            url: '/collections/ahlgrens-bilar/'
                        },
                        {
                            id: 'shop.swedish-candy.gott-och-blandat',
                            title: 'Gott & Blandat',
                            url: '/collections/ahlgrens-bilar/'
                        }
                    ]
                },
                {
                    id: 'shop.chocolate',
                    title: 'Chocolate',
                    image: {
                        alt: 'Marabou Chunks',
                        src: 'https://cdn.shopify.com/s/files/1/0585/6890/0706/files/marabou-chunks.png?v=1718797323',
                        width: 256,
                        height: 256
                    },
                    children: [
                        {
                            id: 'shop.chocolate.marabou',
                            title: 'Marabou',
                            url: '/collections/ahlgrens-bilar/'
                        }
                    ]
                },
                {
                    id: 'shop.licorice',
                    title: 'Licorice',
                    children: [
                        {
                            id: 'shop.licorice.gott-och-blandat',
                            title: 'Gott & Blandat',
                            url: '/collections/ahlgrens-bilar/'
                        }
                    ]
                },
                {
                    id: 'shop.snacks',
                    title: 'Snacks',
                    children: [
                        {
                            id: 'shop.snacks.olw',
                            title: 'OLW',
                            url: '/collections/ahlgrens-bilar/'
                        },
                        {
                            id: 'shop.snacks.estrella',
                            title: 'Estrella',
                            url: '/collections/ahlgrens-bilar/'
                        }
                    ]
                },
                {
                    id: 'shop.misc',
                    title: 'Misc.',
                    children: []
                },
                {
                    id: 'brands.swedish-brands',
                    title: 'Brands',
                    children: [
                        {
                            id: 'brands.swedish-candy.ahlgrens-bilar',
                            title: 'Ahlgrens Bilar',
                            description: "Sweden's most sold car, the famous brand behind the car-shaped candy.",
                            url: '/collections/ahlgrens-bilar/'
                        },
                        {
                            id: 'brands.swedish-candy.gott-och-blandat',
                            title: 'Gott & Blandat',
                            url: '/collections/ahlgrens-bilar/'
                        }
                    ]
                }
            ]
        },
        {
            id: 'sale',
            title: 'SALE',
            url: '/collections/sale/',
            children: []
        },
        {
            id: 'blog',
            title: 'Candy Blog',
            url: '/news/',
            children: []
        },
        {
            id: 'about',
            title: 'Company',
            children: [
                {
                    id: 'about.all-products',
                    title: 'Some Link',
                    image: {
                        alt: 'Classical Swedish Candy',
                        src: 'https://cdn.shopify.com/s/files/1/0585/6890/0706/files/losvikt.png?v=1718860451',
                        width: 256,
                        height: 256
                    },
                    children: [
                        {
                            id: 'about.all-products.ahlgrens-bilar',
                            title: 'Ahlgrens Bilar',
                            description: "Sweden's most sold car, the famous brand behind the car-shaped candy.",
                            url: '/collections/ahlgrens-bilar/'
                        }
                    ]
                },
                {
                    id: 'about.all-products2',
                    title: 'Another One',
                    image: {
                        alt: 'Classical Swedish Candy',
                        src: 'https://cdn.shopify.com/s/files/1/0585/6890/0706/files/losvikt.png?v=1718860451',
                        width: 256,
                        height: 256
                    },
                    children: [
                        {
                            id: 'about.all-products2.ahlgrens-bilar',
                            title: 'Ahlgrens Bilar',
                            description: "Sweden's most sold car, the famous brand behind the car-shaped candy.",
                            url: '/collections/ahlgrens-bilar/'
                        }
                    ]
                }
            ]
        }
    ]
};

export type HeaderProps = {
    shop: OnlineShop;
    locale: Locale;
    i18n: LocaleDictionary;
};

const Header = ({ shop, locale, i18n }: HeaderProps) => {
    const { logo } = shop.design.header;

    const entries = menu.children.map((menu) => {
        const { id, url, title } = menu;

        const label = (
            <>
                {title} {menu.children.length > 0 ? <FiChevronDown /> : null}
            </>
        );

        return (
            <div key={id} className={styles.entry}>
                {url ? (
                    <Link className={styles.link} href={url || '#'}>
                        {label}
                    </Link>
                ) : (
                    <span className={styles.link}>{label}</span>
                )}

                <MegaMenu menu={menu} className={styles['mega-menu']} />
            </div>
        );
    });

    return (
        <header className={styles.container}>
            <div className={styles.content}>
                <Link title={logo.alt} href={'/'} className={styles.logo}>
                    <Image
                        {...logo}
                        title={shop.name}
                        sizes="(max-width: 1024px) 125px, 175px"
                        draggable={false}
                        priority={true}
                        loading="eager"
                        decoding="async"
                    />
                </Link>

                <nav className={styles.menu}>{entries}</nav>

                <div className={styles.actions}>
                    <CartButton locale={locale} i18n={i18n} />
                </div>
            </div>
        </header>
    );
};
Header.displayName = 'Nordcom.Header';

export default Header;
