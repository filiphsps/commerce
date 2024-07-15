import { linkResolver } from '@/utils/prismic';
import { cn } from '@/utils/tailwind';
import { asLink } from '@prismicio/client';

import Link from '@/components/link';
import { PrismicText } from '@/components/typography/prismic-text';

import type { BannerSliceDefault } from '@/prismic/types';

export const BannerDefault = ({ slice }: { slice: BannerSliceDefault }): JSX.Element => {
    return (
        <section
            className="bg-primary text-primary-foreground flex flex-col items-center justify-center gap-4 rounded-lg p-8"
            data-slice-variation={slice.variation}
        >
            <div className="flex flex-col items-center justify-center gap-1 text-center md:max-w-[800px]">
                <PrismicText data={slice.primary.content} />
            </div>

            <div className="flex gap-4 empty:hidden">
                {slice.items.map(({ target: href, type, title }, index) => {
                    const target = asLink(href, { linkResolver });

                    return (
                        <Link
                            key={index}
                            className={cn(
                                'flex items-center gap-2 rounded-full bg-white px-4 py-2 text-black transition-colors hover:bg-black hover:text-white md:px-6 md:py-3 md:text-lg',
                                type &&
                                    'bg-secondary text-secondary-foreground hover:bg-secondary-dark hover:text-secondary-foreground'
                            )}
                            href={target}
                        >
                            <PrismicText data={title} />
                        </Link>
                    );
                })}
            </div>
        </section>
    );
};
