import 'server-only';

import styles from './collapsible-text.module.scss';

import { FiChevronUp } from 'react-icons/fi';

import PageContent from '@/components/page-content';
import { Content as ContentContainer } from '@/components/typography/content';
import { PrismicText } from '@/components/typography/prismic-text';

import type { Content } from '@prismicio/client';
import type { SliceComponentProps } from '@prismicio/react';

/**
 * Props for `CollapsibleText`.
 */
export type CollapsibleTextProps = SliceComponentProps<Content.CollapsibleTextSlice>;

/**
 * Component for "CollapsibleText" Slices.
 */
const CollapsibleText = ({ slice }: CollapsibleTextProps): JSX.Element => {
    return (
        <PageContent
            as="section"
            className={styles.container}
            data-slice-type={slice.slice_type}
            data-slice-variation={slice.variation}
            style={{
                '--background': slice.primary.accent || 'var(--color-block)',
                '--background-dark': slice.primary.accent_dark || 'var(--color-block)',
                '--foreground': 'var(--color-text-primary)'
            }}
        >
            <details className={styles.details}>
                <summary className={styles.summary}>
                    <FiChevronUp className={styles.icon} /> {slice.primary.title}
                </summary>

                <ContentContainer>
                    <PrismicText data={slice.primary.text} />
                </ContentContainer>
            </details>
        </PageContent>
    );
};
CollapsibleText.skeleton = ({ slice }: { slice?: Content.CollectionSlice }) => {
    if (!slice || slice.items.length <= 0) return null;

    return <CollapsibleText {...({ slice } as any)} />;
};

CollapsibleText.displayName = 'Nordcom.Slices.CollapsibleText';
export default CollapsibleText;
