import styles from '@/components/cart/cart-line.module.scss';

import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { CartLineActions } from '@/components/cart/cart-line-actions';
import Heading from '@/components/typography/heading';
import Pricing from '@/components/typography/pricing';

import type { Product, ProductVariant } from '@/api/product';
import type { LocaleDictionary } from '@/utils/locale';
import type { CartLine as ShopifyCartLine } from '@shopify/hydrogen-react/storefront-api-types';

interface CartLineProps {
    i18n: LocaleDictionary;
    data: ShopifyCartLine;
}
const CartLine = ({ i18n, data: line }: CartLineProps) => {
    const product: Required<Product> = line.merchandise.product! as any;
    const variant: Required<ProductVariant> = line.merchandise! as any;
    if (!product || !variant) {
        console.error(`Product or product variant not found for line ${line.id}`);
        return null;
    }

    let discount = 0;
    if (variant.compareAtPrice?.amount) {
        const compare = Number.parseFloat(variant.compareAtPrice!.amount || '0');
        const current = Number.parseFloat(variant.price!.amount || '0');
        discount = Math.round((100 * (compare - current)) / compare) || 0;
    }

    return (
        <div className={`${styles.container} ${discount > 0 ? styles.sale : ''}`}>
            {variant.image ? (
                <Image
                    className={styles.image}
                    src={variant.image.url}
                    alt={variant.image.altText!}
                    width={45}
                    height={45}
                    draggable={false}
                />
            ) : null}

            <div className={styles.details}>
                <Heading
                    titleAs={Link}
                    title={
                        <>
                            <span>
                                {product.vendor} {product.title}
                            </span>
                            <span className={styles.badge}>{variant.title}</span>
                            {discount ? (
                                <span className={`${styles.badge} ${styles.discount}`}>{discount}% off</span>
                            ) : null}
                        </>
                    }
                    titleClassName={styles.title}
                    titleProps={{ href: `/products/${line.merchandise.product.handle}` }}
                    subtitleAs={'div'}
                    subtitle={<Pricing price={variant.price} compareAtPrice={variant.compareAtPrice} />}
                    subtitleClassName={styles.pricing}
                />
            </div>

            <div className={styles['quantity-actions']}>
                <Suspense>
                    <CartLineActions i18n={i18n} data={line} />
                </Suspense>
            </div>
        </div>
    );
};

CartLine.skeleton = () => <section className={styles.container} data-skeleton></section>;

CartLine.displayName = 'Nordcom.Cart.Line';
export { CartLine };