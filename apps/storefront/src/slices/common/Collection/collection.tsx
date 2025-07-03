import 'server-only';

import { type HTMLProps } from 'react';

import { cn } from '@/utils/tailwind';
import { asText } from '@prismicio/client';
import { ChevronRight as ChevronRightIcon } from 'lucide-react';

import Link from '@/components/link';
import PageContent from '@/components/page-content';
import CollectionBlock from '@/components/products/collection-block';
import { Content } from '@/components/typography/content';
import { Title } from '@/components/typography/heading';
import { PrismicText } from '@/components/typography/prismic-text';

import type { CollectionSliceDefault } from '@/prismic/types';

type Slice = {
    slice_type: 'collection';
    slice_label: null;
    id?: string | undefined;
} & CollectionSliceDefault;

export type CollectionContainerProps = {
    slice: Slice;
} & HTMLProps<HTMLDivElement>;

const CollectionContainerHeader = ({ slice }: Omit<CollectionContainerProps, 'children'>) => {
    if (!(slice as any)?.primary?.handle) {
        return null;
    }

    const hasTitle = asText(slice.primary.title).length > 0;
    const hasBody = asText(slice.primary.body).length > 0;

    if (!hasTitle && !hasBody) {
        return null;
    }

    const title = hasTitle ? (
        <Title
            data-align={slice.primary.alignment}
            as={Link}
            href={`/collections/${slice.primary.handle!}`}
            title={asText(slice.primary.title)}
            className={cn(
                'group flex items-center gap-1 text-xl font-bold leading-tight hover:underline focus-visible:underline lg:text-2xl',
                'md:data-[align=left]:text-left md:data-[align=center]:text-center md:data-[align=right]:text-right'
            )}
        >
            <PrismicText data={slice.primary.title} styled={false} bare={true} />
            <ChevronRightIcon className="stroke-2 text-3xl transition-transform group-hover:scale-110 md:text-xl" />
        </Title>
    ) : null;

    const body = hasBody ? (
        <Content
            data-align={slice.primary.alignment}
            className={cn(
                'max-w-none',
                'text-base md:data-[align=center]:max-w-[900px] md:data-[align=left]:text-left md:data-[align=center]:text-center md:data-[align=right]:text-right'
            )}
        >
            <PrismicText data={slice.primary.body} />
        </Content>
    ) : null;

    if (hasTitle && !hasBody) return title;
    return (
        <header
            data-align={slice.primary.alignment}
            className={cn(
                'flex w-full flex-col gap-1',
                'md:data-[align=left]:items-start md:data-[align=right]:items-end md:data-[align=center]:items-center'
            )}
        >
            {title}
            {body}
        </header>
    );
};

const CollectionContainer = async ({ slice, children, className }: CollectionContainerProps) => {
    return (
        <PageContent
            as="section"
            className={cn('flex flex-col items-start justify-start gap-4 self-start', className)}
            data-slice-type={slice.slice_type}
            data-slice-variation={slice.variation}
        >
            <CollectionContainerHeader slice={slice} />

            {children as any}
        </PageContent>
    );
};

CollectionContainer.skeleton = ({ slice, className }: { slice?: Slice; className?: string }) => {
    if (!slice || !(slice as any)?.primary) {
        return null;
    }

    return (
        <PageContent
            as="section"
            className={cn('flex flex-col items-start justify-start gap-4 self-start', className)}
            data-slice-type={slice.slice_type}
            data-slice-variation={slice.variation}
        >
            <CollectionContainerHeader slice={slice} />

            <CollectionBlock.skeleton isHorizontal={slice.primary.direction === 'horizontal'} />
        </PageContent>
    );
};

CollectionContainer.displayName = 'Nordcom.Slices.Collection.Container';
export default CollectionContainer;
