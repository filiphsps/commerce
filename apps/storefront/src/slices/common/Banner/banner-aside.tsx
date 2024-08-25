import { linkResolver } from '@/utils/prismic';
import { cn } from '@/utils/tailwind';
import { asLink } from '@prismicio/client';
import Image from 'next/image';

import { Button } from '@/components/actionable/button';
import Link from '@/components/link';
import { PrismicText } from '@/components/typography/prismic-text';

import type { BannerSliceAside } from '@/prismic/types';

export const BannerAside = ({ slice, index = 100 }: { slice: BannerSliceAside; index?: number }): JSX.Element => {
    const priority = index < 2;

    const background = slice.primary.background;
    const image = slice.primary.image;

    const textColor = slice.primary.text_color;

    return (
        <section
            className={cn(
                'bg-primary text-primary-foreground flex grid-flow-col justify-between gap-2 rounded-lg md:grid md:min-h-36 md:grid-cols-6',
                background.url && 'bg-cover bg-center bg-no-repeat text-black'
            )}
            style={{
                backgroundImage: background.url ? `url('${background.url}')` : undefined
            }}
            data-slice-variation={slice.variation}
        >
            <div className="col-span-4 flex h-full w-full flex-col items-start justify-center gap-4 p-4 md:p-8">
                <div
                    className="flex flex-col items-start justify-center gap-1 text-left drop-shadow-sm md:max-w-[600px]"
                    style={{
                        color: textColor ?? undefined,
                        textShadow: background.url ? '1px 1px 10px #000' : undefined
                    }}
                >
                    <PrismicText data={slice.primary.content} />
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
                                    'flex items-center gap-2 rounded-full bg-white px-4 py-2 font-semibold text-black drop-shadow-sm transition-colors hover:bg-black hover:text-white md:px-6 md:py-3 md:text-lg',
                                    type &&
                                        'bg-secondary text-secondary-foreground hover:bg-secondary-dark hover:text-secondary-foreground'
                                )}
                                href={href}
                                target={target}
                            >
                                <PrismicText data={title} />
                            </Button>
                        );
                    })}
                </div>
            </div>

            <Image
                src={image.url!}
                width={image.dimensions?.width!}
                height={image.dimensions?.height!}
                alt={image.alt || image.copyright || ''}
                className="col-span-2 hidden h-full w-full object-cover object-center md:flex"
                draggable={false}
                loading={priority ? 'eager' : 'lazy'}
                priority={priority}
                decoding="async"
            />
        </section>
    );
};
