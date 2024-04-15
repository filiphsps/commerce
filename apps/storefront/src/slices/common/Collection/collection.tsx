import 'server-only';

import styles from './collection.module.scss';

import { type ReactNode } from 'react';

import { asText } from '@prismicio/client';

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
    children: ReactNode;
};

const CollectionContainerHeader = ({ slice }: Omit<CollectionContainerProps, 'children'>) => {
    if (!slice || !slice.primary || asText(slice.primary.title).length <= 0) return null;
    if (!slice.primary.handle) {
        console.error(new Error('Collection slice is missing a handle.')); // FIXME: Correct error.
        return null;
    }

    return (
        <>
            <Title
                as={Link}
                href={`/collections/${slice.primary.handle!}`}
                // TODO: i18n.
                title={`View all products in "${asText(slice.primary.title)}"`}
                className={`${styles.title} ${
                    (slice.primary.alignment === 'left' && styles['align-left']) ||
                    (slice.primary.alignment === 'right' && styles['align-right']) ||
                    styles['align-center']
                }`}
            >
                <PrismicText data={slice.primary.title} />
            </Title>
            <Content
                className={`${styles.body} ${
                    (slice.primary.alignment === 'left' && styles['align-left']) ||
                    (slice.primary.alignment === 'right' && styles['align-right']) ||
                    styles['align-center']
                }`}
            >
                <PrismicText data={slice.primary.body} />
            </Content>
        </>
    );
};

const CollectionContainer = async ({ slice, children }: CollectionContainerProps) => {
    return (
        <PageContent
            as="section"
            className={styles.container}
            data-slice-type={slice.slice_type}
            data-slice-variation={slice.variation}
        >
            <CollectionContainerHeader slice={slice} />

            {children}
        </PageContent>
    );
};

CollectionContainer.skeleton = ({ slice }: { slice?: Slice }) => {
    if (!slice || !slice.primary) return null;

    return (
        <PageContent
            as="section"
            className={styles.container}
            data-slice-type={slice.slice_type}
            data-slice-variation={slice.variation}
            data-skeleton
        >
            <CollectionContainerHeader slice={slice} />

            <CollectionBlock.skeleton isHorizontal={slice.primary.direction === 'horizontal'} />
        </PageContent>
    );
};

CollectionContainer.displayName = 'Nordcom.Slices.Collection.Container';
export default CollectionContainer;
