import 'server-only';

import styles from './collection.module.scss';

import { FiChevronRight } from 'react-icons/fi';

import { cn } from '@/utils/tailwind';
import { asText } from '@prismicio/client';

import Link from '@/components/link';
import PageContent from '@/components/page-content';
import CollectionBlock from '@/components/products/collection-block';
import { Content } from '@/components/typography/content';
import { Title } from '@/components/typography/heading';
import { PrismicText } from '@/components/typography/prismic-text';

import type { CollectionSliceDefault } from '@/prismic/types';
import type { HTMLProps } from 'react';

type Slice = {
    slice_type: 'collection';
    slice_label: null;
    id?: string | undefined;
} & CollectionSliceDefault;

export type CollectionContainerProps = {
    slice: Slice;
} & HTMLProps<HTMLDivElement>;

const CollectionContainerHeader = ({ slice }: Omit<CollectionContainerProps, 'children'>) => {
    if (!slice || !slice.primary || !slice.primary.handle) {
        return null;
    }

    const hasTitle = asText(slice.primary.title).length > 0;
    const hasBody = asText(slice.primary.body).length > 0;

    if (!hasTitle && !hasBody) {
        return null;
    }

    const alignment =
        (slice.primary.alignment === 'left' && styles['align-left']) ||
        (slice.primary.alignment === 'right' && styles['align-right']) ||
        styles['align-center'];

    const title = hasTitle ? (
        <Title
            as={Link}
            href={`/collections/${slice.primary.handle!}`}
            // TODO: i18n.
            title={`View all products in "${asText(slice.primary.title)}"`}
            className={cn(
                styles.title,
                alignment,
                'group flex items-center gap-1 text-xl font-bold leading-snug hover:underline lg:text-2xl'
            )}
        >
            <PrismicText data={slice.primary.title} styled={false} bare={true} />
            <FiChevronRight
                style={{ strokeWidth: 3.5 }}
                className="text-3xl transition-transform group-hover:scale-125 md:text-xl"
            />
        </Title>
    ) : null;

    const body = hasBody ? (
        <Content className={cn(styles.body, alignment, 'font-semibold')}>
            <PrismicText data={slice.primary.body} />
        </Content>
    ) : null;

    if (hasTitle && !hasBody) return title;
    return (
        <header className="flex w-full flex-col gap-1">
            {title}
            {body}
        </header>
    );
};

const CollectionContainer = async ({ slice, children, className }: CollectionContainerProps) => {
    return (
        <PageContent
            as="section"
            className={cn(styles.container, 'gap-4', className)}
            data-slice-type={slice.slice_type}
            data-slice-variation={slice.variation}
        >
            <CollectionContainerHeader slice={slice} />

            {children}
        </PageContent>
    );
};

CollectionContainer.skeleton = ({ slice }: { slice?: Slice }) => {
    if (!slice || !slice.primary) {
        return null;
    }

    return (
        <PageContent
            as="section"
            className={styles.container}
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
