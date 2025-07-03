'use client';

import { Fragment, Suspense, useCallback, useEffect, useState } from 'react';
import { EmailShareButton, FacebookShareButton, TwitterShareButton } from 'react-share';

import { getTranslations } from '@/utils/locale';
import { cn } from '@/utils/tailwind';
import { Mail as MailIcon } from 'lucide-react';
import Image from 'next/image';

import type { Product } from '@/api/product';
import type { LocaleDictionary } from '@/utils/locale';
import type { Image as ShopifyImage } from '@shopify/hydrogen-react/storefront-api-types';
import type { HTMLProps, ReactNode } from 'react';

const SHARE_BUTTON_STYLES =
    'z-10 flex h-8 w-8 appearance-none items-center justify-center rounded-full border-2 border-solid border-gray-300 bg-white fill-primary stroke-primary object-cover object-center transition-colors hover:border-primary hover:text-primary md:h-9 md:w-9';

export type ProductGalleryProps = {
    initialImageId?: string | null;
    images: ShopifyImage[] | null;
    actions?: ReactNode | ReactNode[];
    enableShare?: boolean;
    padding?: boolean;
    pageUrl: string;
    i18n: LocaleDictionary;
    product: Product;
    primaryImageClassName?: string;
} & HTMLProps<HTMLDivElement>;
const ProductGallery = ({
    initialImageId,
    images,
    className,
    actions,
    enableShare = true,
    padding = true,
    pageUrl,
    i18n,
    product,
    primaryImageClassName,
    ...props
}: ProductGalleryProps) => {
    const [loading, setLoading] = useState<boolean>(false);
    const [selected, setSelected] = useState<ShopifyImage | null>(null);
    const [next, setNext] = useState<ShopifyImage | null>(null);

    const { t } = getTranslations('common', i18n);

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
    }, [, images, initialImageId, selected, setImage]);

    if (!images || images.length <= 0) return null;

    const image = next || selected;
    const isLoading = loading || !image;
    const loadingProps = { ...(isLoading ? { 'data-skeleton': true } : {}) };

    const title = enableShare ? product.seo.title || `${product.vendor} ${product.title}` : undefined;

    return (
        <section draggable={false} className={cn(className)} {...props}>
            <div className="flex w-full gap-2 overflow-clip md:sticky md:top-36 md:flex-col lg:gap-3">
                <div
                    className={cn(
                        'relative flex h-1/4 w-full grow items-center justify-center overflow-hidden rounded-lg border border-solid border-gray-200 bg-white p-2 md:h-full md:p-3',
                        isLoading && 'bg-gray-100',
                        padding && 'p-8 py-12 md:p-16'
                    )}
                    {...loadingProps}
                >
                    {image ? (
                        <div className="z-5 h-fit min-h-32 w-full transform-gpu overflow-hidden md:h-full md:max-h-[30rem]">
                            <Image
                                role={image.altText ? undefined : 'presentation'}
                                src={image.url!}
                                alt={image.altText!}
                                title={image.altText!}
                                width={image.width ?? 500}
                                height={image.height ?? 500}
                                sizes="(max-width: 920px) 75vw, 500px"
                                loading="eager"
                                decoding="async"
                                onLoadStart={() => setLoading(true)}
                                onLoad={() => {
                                    setTimeout(() => setLoading(() => false), 250);

                                    if (!next) {
                                        return;
                                    }

                                    setSelected(() => next);
                                    setNext(null);
                                }}
                                className={cn(
                                    'opacity-1 h-fit w-full object-contain object-center transition-opacity duration-500 md:h-full md:max-h-[30rem]',
                                    isLoading && 'opacity-0 transition-none',
                                    primaryImageClassName
                                )}
                            />
                        </div>
                    ) : (
                        <div className="h-full min-h-32 w-full md:min-h-[36rem]" />
                    )}

                    {!isLoading && enableShare ? (
                        <div
                            className={cn(
                                'absolute inset-x-2 top-2 flex flex-row-reverse items-start justify-between gap-2',
                                'hidden md:flex'
                            )}
                        >
                            <Suspense fallback={<Fragment />}>
                                <div className="flex flex-col gap-2 empty:hidden md:gap-1">
                                    <EmailShareButton
                                        key="email"
                                        url={pageUrl}
                                        className={SHARE_BUTTON_STYLES}
                                        resetButtonStyle={false}
                                        title={title}
                                        htmlTitle={t('share-via-email').toString()}
                                    >
                                        <MailIcon className="stroke-2" />
                                    </EmailShareButton>
                                    <FacebookShareButton
                                        key="facebook"
                                        url={pageUrl}
                                        className={SHARE_BUTTON_STYLES}
                                        resetButtonStyle={false}
                                        title={title}
                                        htmlTitle={t('share-on-facebook').toString()}
                                    >
                                        <Image
                                            className="stroke-2"
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
                                        htmlTitle={t('share-on-x').toString()}
                                    >
                                        <Image
                                            className="stroke-2"
                                            src="/assets/icons/social/twitter-outline.svg"
                                            alt="X (Twitter)"
                                            width={20}
                                            height={20}
                                        />
                                    </TwitterShareButton>

                                    {actions}
                                </div>
                            </Suspense>

                            {image.altText ? (
                                <div className="rounded-lg bg-gray-100 p-1 px-2 text-sm font-semibold text-gray-500 opacity-80">
                                    {image.altText}
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </div>

                {image && images.length > 1 ? (
                    <aside className="flex grid-cols-4 grid-rows-[1fr] flex-col gap-2 overflow-hidden md:grid md:h-40">
                        {images
                            .filter(({ id }) => image.id !== id)
                            .map((image, index) => {
                                return (
                                    <button
                                        type="button"
                                        key={image.id}
                                        aria-label={`Enlarge image #${index + 1}`}
                                        onClick={() => setImage(image)}
                                        className={cn(
                                            'hover:border-primary flex appearance-none items-center justify-center rounded-lg border-2 border-solid border-gray-100 bg-white p-1 transition-all md:aspect-[4/3] md:size-32 md:p-4',
                                            isLoading && 'bg-gray-100'
                                        )}
                                        {...loadingProps}
                                    >
                                        <Image
                                            className={cn(
                                                'h-14 w-14 object-contain object-center transition-opacity duration-500 md:aspect-[4/3] md:size-full',
                                                isLoading && 'opacity-0 transition-none'
                                            )}
                                            style={{ transitionDelay: `${(index + 1) * 250}ms` }}
                                            src={image.url!}
                                            alt={image.altText || `#${index + 1}`}
                                            title={image.altText!}
                                            width={image.width ?? 175}
                                            height={image.height ?? 175}
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
