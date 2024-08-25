'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiMail } from 'react-icons/fi';
import { EmailShareButton, FacebookShareButton, TwitterShareButton } from 'react-share';

import { useTranslation } from '@/utils/locale';
import { cn } from '@/utils/tailwind';
import Image from 'next/image';

import type { Product } from '@/api/product';
import type { LocaleDictionary } from '@/utils/locale';
import type { Image as ShopifyImage } from '@shopify/hydrogen-react/storefront-api-types';
import type { HTMLProps, ReactNode } from 'react';

const SHARE_BUTTON_STYLES =
    'z-10 flex h-7 w-7 appearance-none items-center justify-center rounded-full border border-solid border-gray-300 bg-white fill-primary stroke-primary object-cover object-center transition-colors hover:border-primary hover:text-primary md:h-8 md:w-8';

export type ProductGalleryProps = {
    initialImageId?: string | null;
    images: ShopifyImage[] | null;
    actions?: ReactNode | ReactNode[];
    pageUrl: string;
    i18n: LocaleDictionary;
    product: Product;
} & HTMLProps<HTMLDivElement>;
const ProductGallery = ({
    initialImageId,
    images,
    className,
    actions,
    pageUrl,
    i18n,
    product,
    ...props
}: ProductGalleryProps) => {
    const [loading, setLoading] = useState<boolean>(false);
    const [selected, setSelected] = useState<ShopifyImage | null>(null);
    const [next, setNext] = useState<ShopifyImage | null>(null);

    const { t } = useTranslation('common', i18n);

    const setImage = useCallback(
        (image: ShopifyImage) => {
            // Prevent the user from spamming the buttons.
            if (loading) return;

            setLoading(true);
            setNext(image);
        },
        [loading]
    );

    useEffect(() => {
        if (selected || !images) {
            return;
        }

        const target = initialImageId ? images.find(({ id }) => id === initialImageId) : images[0];
        if (!target) {
            return;
        }

        setImage(target);
    }, [, images, initialImageId]);

    if (!images || images.length <= 0) return null;

    const image = next || selected;
    const loadingProps = { ...(!image || loading ? { 'data-skeleton': true } : {}) };

    const title = product.seo.title || `${product.vendor} ${product.title}`;

    return (
        <section draggable={false} className={cn(className)} {...props}>
            <div className="sticky top-36 flex w-full flex-col gap-2 overflow-clip lg:gap-4">
                <div
                    className="relative overflow-hidden rounded-lg border-2 border-solid border-gray-100 bg-white p-8 md:aspect-[4/3] md:p-16"
                    {...loadingProps}
                >
                    {image ? (
                        <Image
                            className={cn(
                                'opacity-1 h-full min-h-32 w-full object-contain object-center transition-opacity duration-500 md:min-h-[36rem]',
                                loading && 'opacity-0 transition-none'
                            )}
                            src={image.url!}
                            alt={image.altText!}
                            title={image.altText!}
                            width={500}
                            height={500}
                            sizes="(max-width: 920px) 80vw, 500px"
                            loading="eager"
                            decoding="async"
                            onLoad={() => {
                                setTimeout(() => setLoading(() => false), 250);

                                if (!next) return;
                                setSelected(() => next);
                                setNext(null);
                            }}
                        />
                    ) : (
                        <div className="h-full min-h-32 w-full md:min-h-[36rem]" />
                    )}

                    <div className="absolute inset-x-2 top-2 flex flex-row-reverse items-start justify-between gap-2">
                        <div className="flex flex-col gap-1">
                            <EmailShareButton
                                key="email"
                                url={pageUrl}
                                className={SHARE_BUTTON_STYLES}
                                resetButtonStyle={false}
                                title={title}
                                htmlTitle={t('share-via-email')}
                            >
                                <FiMail />
                            </EmailShareButton>
                            <FacebookShareButton
                                key="facebook"
                                url={pageUrl}
                                className={SHARE_BUTTON_STYLES}
                                resetButtonStyle={false}
                                title={title}
                                htmlTitle={t('share-on-facebook')}
                            >
                                <Image
                                    src="/assets/icons/social/facebook-outline.svg"
                                    alt="Facebook"
                                    width={20}
                                    height={20}
                                />
                            </FacebookShareButton>
                            <TwitterShareButton
                                key="twitter"
                                url={pageUrl}
                                className={SHARE_BUTTON_STYLES}
                                resetButtonStyle={false}
                                title={title}
                                htmlTitle={t('share-on-x')}
                            >
                                <Image
                                    src="/assets/icons/social/twitter-outline.svg"
                                    alt="X (Twitter)"
                                    width={20}
                                    height={20}
                                />
                            </TwitterShareButton>

                            {actions}
                        </div>

                        {image?.altText ? (
                            <div className="rounded-lg bg-gray-100 p-1 px-2 text-sm font-semibold text-gray-500 opacity-80">
                                {image.altText}
                            </div>
                        ) : null}
                    </div>
                </div>

                {image && images.length > 1 ? (
                    <aside className="grid grid-cols-4 gap-2 overflow-hidden lg:h-fit">
                        {images
                            .filter(({ id }) => image.id !== id)
                            .map((image, index) => {
                                return (
                                    <button
                                        key={image.id}
                                        aria-label={`Enlarge image #${index + 1}`}
                                        onClick={() => setImage(image)}
                                        className={cn(
                                            'hover:border-primary flex h-full appearance-none items-center justify-center rounded-lg border-2 border-solid border-gray-100 bg-white transition-all md:p-8 lg:aspect-square lg:h-full lg:w-auto'
                                        )}
                                        {...loadingProps}
                                    >
                                        <Image
                                            className={cn(
                                                'h-14 w-14 object-contain object-center transition-opacity duration-500 md:aspect-square md:h-full md:w-full',
                                                loading && 'opacity-0 transition-none'
                                            )}
                                            style={{ transitionDelay: `${(index + 1) * 250}ms` }}
                                            src={image.url!}
                                            alt={image.altText!}
                                            title={image.altText!}
                                            width={175}
                                            height={175}
                                            sizes="(max-width: 920px) 75px, 175px"
                                            loading="eager"
                                            decoding="async"
                                            draggable={false}
                                        />
                                    </button>
                                );
                            })}
                    </aside>
                ) : null}
            </div>
        </section>
    );
};

ProductGallery.displayName = 'Nordcom.Products.Gallery';
export { ProductGallery };
