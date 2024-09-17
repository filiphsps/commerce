import type { Content } from '@prismicio/client';
import type { SliceComponentProps } from '@prismicio/react';
import type { ReactNode } from 'react';

export type OriginalContentProps = SliceComponentProps<Content.OriginalContentSlice, { pageContent?: ReactNode }>;
function OriginalContent({ /* slice, */ context: { pageContent } }: OriginalContentProps) {
    if (pageContent) {
        return pageContent;
    }

    return null;
}

export default OriginalContent;
