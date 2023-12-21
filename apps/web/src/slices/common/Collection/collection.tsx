import 'server-only';

import Link from '@/components/link';
import PageContent from '@/components/page-content';
import CollectionBlock from '@/components/products/collection-block';
import { Content } from '@/components/typography/content';
import { Title } from '@/components/typography/heading';
import { PrismicText } from '@/components/typography/prismic-text';
import type { CollectionSliceDefault } from '@/prismic/types';
import { asText } from '@prismicio/client';
import { type ReactNode } from 'react';
import styles from './collection.module.scss';

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
    if (!slice || !slice.primary || asText(slice.primary.title)?.length <= 0) return null;

    return (
        <div
            className={`${styles.header} ${
                (slice.primary.alignment === 'left' && styles['align-left']) ||
                (slice.primary.alignment === 'right' && styles['align-right']) ||
                styles['align-center']
            }`}
        >
            <Link
                href={`/collections/${slice.primary.handle!}`}
                title={`View all products in "${asText(slice.primary.title)}"`} // TODO: i18n.
                prefetch={false}
            >
                <Title className={styles.title} as={'div'}>
                    <PrismicText data={slice.primary.title} />
                </Title>
            </Link>
            <Content className={styles.body}>
                <PrismicText data={slice.primary.body} />
            </Content>
        </div>
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
