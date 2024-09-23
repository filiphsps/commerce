import { cn } from '@/utils/tailwind';
import Image from 'next/image';

import { Card } from '@/components/layout/card';
import { Content } from '@/components/typography/content';

import type { Color } from '@/api/shop';
import type { HTMLProps } from 'react';

export type OverviewProps = {
    body?: React.ReactNode;
    image?: {
        alt?: string;
        url: string;
        dimensions: {
            height: number;
            width: number;
        };
    };
    imageStyle?: 'normal' | 'cover';
    layout?: 'left' | 'right' | 'center';
    accent?: Color;
} & Omit<HTMLProps<HTMLDivElement>, 'children'>;

export const Overview = ({
    body,
    image,
    imageStyle = 'normal',
    layout = 'left',
    accent,
    className,
    ...props
}: OverviewProps) => {
    if (!body) {
        return null;
    }

    if (!image) {
        return <Content className="max-w-none">{body}</Content>;
    }

    const imageElement = (
        <div
            style={{
                ...(accent && {
                    '--accent-primary': accent
                })
            }}
            className={cn(
                'relative z-0 col-span-3 flex h-32 w-full overflow-hidden bg-[var(--accent-primary)] p-3 lg:h-auto',
                layout === 'center' && 'h-32 lg:h-28',
                imageStyle === 'cover' && 'p-0'
            )}
        >
            <Image
                role={image.alt ? undefined : 'presentation'}
                className={cn(
                    'absolute inset-0 z-[1] h-full w-full object-contain object-center',
                    imageStyle === 'cover' && 'object-cover'
                )}
                src={image.url}
                alt={image.alt!}
                width={image.dimensions.width}
                height={image.dimensions.height}
                sizes="(max-width: 1150px) 250px, 250px"
                decoding="async"
                loading="lazy"
                draggable={false}
            />
        </div>
    );

    const contentElement = (
        <Card className="col-span-7 py-3 md:h-full md:px-3">
            <Content className="prose max-w-full">{body}</Content>
        </Card>
    );

    return (
        <section
            className={cn(
                'flex flex-col overflow-hidden rounded-lg bg-gray-100 empty:hidden lg:grid',
                layout === 'left' && 'lg:grid-cols-10',
                layout === 'right' && 'lg:grid-cols-10',
                layout === 'center' && 'flex flex-col lg:flex',
                className
            )}
            {...props}
        >
            {layout === 'right' ? contentElement : imageElement}
            {layout === 'right' ? imageElement : contentElement}
        </section>
    );
};
