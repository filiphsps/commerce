import { asLink } from '@prismicio/client';
import type { JSX } from 'react';
import { Button } from '@/components/actionable/button';
import Link from '@/components/link';
import { Content } from '@/components/typography/content';
import { PrismicText } from '@/components/typography/prismic-text';
import type { BannerSliceDefault } from '@/prismic/types';
import { linkResolver } from '@/utils/prismic';
import { cn } from '@/utils/tailwind';

export const BannerDefault = ({ slice }: { slice: BannerSliceDefault }): JSX.Element => {
    return (
        <section
            className="flex flex-col items-center justify-center gap-4 rounded-lg bg-primary p-8 text-primary-foreground"
            data-slice-variation={slice.variation}
        >
            <div className="flex h-full w-full flex-col items-center justify-center text-center empty:hidden">
                <Content className="lg:prose-lg max-w-none">
                    <PrismicText data={slice.primary.content} styled={false} />
                </Content>
            </div>

            <div className="flex gap-4 empty:hidden">
                {slice.items.map(({ target: link, type, title }, index) => {
                    const href = asLink(link, { linkResolver });
                    if (!href) return null;

                    const target: undefined | '_blank' =
                        (href as unknown as { target?: '_blank' })?.target || undefined;

                    return (
                        <Button
                            as={Link}
                            key={index}
                            className={cn(
                                'flex items-center gap-2 rounded-full bg-white px-4 py-2 text-black transition-colors hover:bg-black hover:text-white md:px-6 md:py-3 md:text-lg',
                                type &&
                                    'bg-secondary text-secondary-foreground hover:bg-secondary-dark hover:text-secondary-foreground',
                            )}
                            href={href}
                            target={target}
                        >
                            <PrismicText data={title} />
                        </Button>
                    );
                })}
            </div>
        </section>
    );
};
