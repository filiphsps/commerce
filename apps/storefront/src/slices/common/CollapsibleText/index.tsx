import 'server-only';

import styles from './collapsible-text.module.scss';

import { FiChevronUp } from 'react-icons/fi';

import { cn } from '@/utils/tailwind';

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
        <details
            data-slice-type={slice.slice_type}
            data-slice-variation={slice.variation}
            className={cn(
                'group',
                styles.details,
                'w-full appearance-none rounded-lg border-2 border-solid border-gray-300 bg-gray-100 py-3 transition-all duration-150'
            )}
        >
            <summary
                className={cn(
                    styles.summary,
                    'flex appearance-none items-center justify-start gap-2 border-0 border-solid border-gray-300 px-2 transition-all duration-150 group-open:mb-3 group-open:border-b-2 group-open:pb-3'
                )}
            >
                <div className="flex h-8 w-12 items-center justify-center">
                    <FiChevronUp className="h-full w-full py-1 transition-transform duration-150 group-open:rotate-180" />
                </div>

                <div className="text-base font-semibold leading-snug">{slice.primary.title}</div>
            </summary>

            <ContentContainer className="px-4 py-1">
                <PrismicText data={slice.primary.text} />
            </ContentContainer>
        </details>
    );
};
CollapsibleText.skeleton = ({ slice }: { slice?: Content.CollectionSlice }) => {
    if (!slice || slice.items.length <= 0) return null;

    return <CollapsibleText {...({ slice } as any)} />;
};

CollapsibleText.displayName = 'Nordcom.Slices.CollapsibleText';
export default CollapsibleText;
