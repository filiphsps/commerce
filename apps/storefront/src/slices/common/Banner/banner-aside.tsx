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
    const textShadow =
        typeof (slice.primary.text_shadow as boolean | undefined) === 'undefined' ? true : slice.primary.text_shadow;

    return (
        <section
            className={cn(
                'bg-primary text-primary-foreground relative flex h-full min-h-fit grid-flow-col justify-between gap-2 overflow-hidden overflow-x-clip rounded-lg md:grid md:grid-cols-6',
                background.url && 'bg-center bg-repeat text-black'
            )}
            style={{
                backgroundImage: background.url ? `url('${background.url}&auto=enhance&q=92')` : undefined
            }}
            data-slice-variation={slice.variation}
        >
            <div className="z-10 col-span-4 flex h-full w-full flex-col items-start justify-center gap-4 p-3 py-5 md:max-w-[720px] md:px-6 md:py-10 lg:gap-6">
                <div
                    className="mr-[4rem] flex h-full min-h-fit flex-col items-start justify-center gap-1 text-left md:m-0"
                    style={{
                        color: textColor ?? undefined,
                        textShadow: background.url && textShadow ? '1px 1px 10px #000' : '1px 1px 0px rgba(0,0,0,.45)'
                    }}
                >
                    <Content
                        className={cn(
                            'prose-h1:first-of-type:text-2xl md:prose-h1:first-of-type:text-3xl md:prose-h1:first-of-type:leading-normal prose-h2:first-of-type:text-xl md:prose-h2:first-of-type:text-3xl prose-h1:first-of-type:leading-tight md:prose-h2:first-of-type:leading-snug prose-h2:first-of-type:leading-tight',
                            'md:prose-h1:first-of-type:text-4xl md:prose-h2:first-of-type:text-4xl md:prose-h1:first-of-type:leading-normal md:prose-h2:first-of-type:leading-normal prose-h2:first:-mt-1 md:prose-h2:first:-mt-3 prose-h1:first:-mt-1 md:prose-h1:first:-mt-2 prose-p:text-sm md:prose-p:text-base [&>h1>strong]:underline'
                        )}
                    >
                        <PrismicText data={slice.primary.content} styled={false} />
                    </Content>
                </div>

                <div className="flex w-full flex-wrap items-start justify-start gap-3 empty:hidden md:gap-6">
                    {slice.items.map(({ type, target: link, title }, index) => {
                        const href = asLink(link, { linkResolver });
                        const target: undefined | '_blank' = (href as any).target || undefined;

                        return (
                            <Button
                                as={Link}
                                key={`${target}-${index}`}
                                className={cn(
                                    'rounded-lg bg-white p-2 px-4 leading-normal text-black drop-shadow hover:shadow',
                                    type && 'bg-secondary text-secondary-foreground'
                                )}
                                href={href}
                                target={target}
                            >
                                <PrismicText data={title} styled={false} />
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
                className="absolute -right-[calc(100%-8rem)] left-auto z-0 col-span-2 hidden h-full w-full object-cover object-left md:relative md:inset-0 md:flex"
                draggable={false}
                loading={priority ? 'eager' : 'lazy'}
                priority={priority}
                unoptimized={(image.url || '').includes('.gif')}
                decoding="async"
                quality={92}
            />
        </section>
    );
};
