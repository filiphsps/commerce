import { cn } from '@/utils/tailwind';
import Image from 'next/image';

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
                'relative col-span-3 flex h-32 bg-[var(--accent-primary)] p-3 lg:h-auto',
                layout === 'center' && 'h-32 lg:h-28',
                imageStyle === 'cover' && 'p-0'
            )}
        >
            <Image
                className={cn('h-full w-full object-contain object-center', imageStyle === 'cover' && 'object-cover')}
                src={image.url!}
                alt={image.alt!}
                sizes="(max-width: 1150px) 250px, 250px"
                decoding="async"
                draggable={false}
                fill
            />
        </div>
    );

    const contentElement = (
        <div className="col-span-7 h-full w-full px-3 py-2 empty:hidden md:px-5 md:py-4">
            <Content className="max-w-none">{body}</Content>
        </div>
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