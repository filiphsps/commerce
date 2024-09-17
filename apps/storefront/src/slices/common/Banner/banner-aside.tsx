import { Suspense } from 'react';

import { linkResolver } from '@/utils/prismic';
import { cn } from '@/utils/tailwind';
import { asLink } from '@prismicio/client';
import Image from 'next/image';

import { Button } from '@/components/actionable/button';
import Link from '@/components/link';
import { Content } from '@/components/typography/content';
import { PrismicText } from '@/components/typography/prismic-text';

import type { BannerSliceAside } from '@/prismic/types';

export const BannerAside = ({ slice, index = 100 }: { slice: BannerSliceAside; index?: number }): JSX.Element => {
    const priority = index < 2;

    const background = slice.primary.background;
    const image = slice.primary.image;
    const imageAlt = image.alt || image.copyright || undefined;

    const textColor = slice.primary.text_color;

    return (
        <section
            className={cn(
                'bg-primary text-primary-foreground relative flex grid-flow-col justify-between gap-2 overflow-hidden rounded-lg md:grid md:grid-cols-6',
                background.url && 'bg-cover bg-center bg-no-repeat text-black'
            )}
            style={{
                backgroundImage: background.url ? `url('${background.url}')` : undefined
            }}
            data-slice-variation={slice.variation}
        >
            <div className="z-10 col-span-4 mr-[6rem] flex h-full w-full flex-col items-start justify-center gap-4 p-4 md:m-0 md:px-6 lg:gap-6">
                <div
                    className="flex flex-col items-start justify-center gap-1 text-left"
                    style={{
                        color: textColor ?? undefined,
                        textShadow: background.url ? '1px 1px 10px #000' : undefined
                    }}
                >
                    <Content className="prose-headings:mt-0">
                        <Suspense>
                            <PrismicText data={slice.primary.content} styled={false} />
                        </Suspense>
                    </Content>
                </div>
                <div className="flex w-full items-start justify-start gap-4 empty:hidden md:max-w-[600px]">
                    {slice.items.map(({ type, target: link, title }, index) => {
                        const href = asLink(link, { linkResolver });
                        const target: undefined | '_blank' = (href as any).target || undefined;

                        return (
                            <Button
                                as={Link}
                                key={`${target}-${index}`}
                                className={cn(
                                    'bg-white text-base text-black shadow hover:bg-black hover:text-white',
                                    type &&
                                        'bg-secondary text-secondary-foreground hover:bg-secondary-dark hover:text-secondary-foreground'
                                )}
                                href={href}
                                target={target}
                            >
                                <Suspense>
                                    <PrismicText data={title} styled={false} />
                                </Suspense>
                            </Button>
                        );
                    })}
                </div>
            </div>

            <Image
                role={imageAlt ? undefined : 'presentation'}
                src={image.url!}
                width={image.dimensions?.width!}
                height={image.dimensions?.height!}
                alt={imageAlt!}
                className="absolute -right-[calc(100%-8rem)] left-auto z-0 col-span-2 h-full w-full object-cover object-left md:relative md:inset-0 md:flex md:object-center"
                draggable={false}
                loading={priority ? 'eager' : 'lazy'}
                priority={priority}
                unoptimized={(image.url || '').includes('.gif')}
                decoding="async"
            />
        </section>
    );
};
