import { Content, asHTML } from '@prismicio/client';

import PageContent from '@/components/PageContent';
import { SliceComponentProps } from '@prismicio/react';
import TextBlockComponent from '@/components/TextBlock';
import styled from 'styled-components';

const Container = styled.section`
    width: 100%;
    padding: 0px;
    margin: 0px;
`;

/**
 * Props for `TextBlock`.
 */
export type TextBlockProps = SliceComponentProps<Content.TextBlockSlice>;

/**
 * Component for "TextBlock" Slices.
 */
const TextBlock = ({ slice }: TextBlockProps): JSX.Element => {
    return (
        <Container data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
            <PageContent>
                {slice?.items?.map((item, index) => {
                    return (
                        // eslint-disable-next-line react/jsx-no-undef
                        <TextBlockComponent
                            key={index}
                            image={(item?.image?.url && (item.image as any)) || undefined}
                            body={asHTML(item?.text) || ''}
                        />
                    );
                })}
            </PageContent>
        </Container>
    );
};

export default TextBlock;
