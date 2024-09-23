import type { Content } from '@prismicio/client';
import type { SliceComponentProps } from '@prismicio/react';

export type CustomHTMLProps = SliceComponentProps<Content.CustomHtmlSlice>;
export default function CustomHTML({ slice }: CustomHTMLProps) {
    return (
        <section
            className="empty:contents"
            data-slice-type={slice.slice_type}
            data-slice-variation={slice.variation}
            dangerouslySetInnerHTML={{ __html: slice.primary.html || '' }}
            suppressHydrationWarning={true}
            suppressContentEditableWarning={true}
        />
    );
}
