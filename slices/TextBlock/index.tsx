import { Content, asHTML } from '@prismicio/client';

import ContentBlock from '../../src/components/ContentBlock';
import PageContent from '../../src/components/PageContent';
import { SliceComponentProps } from '@prismicio/react';
import TextBlockComponent from '../../src/components/TextBlock';
import styled from 'styled-components';

const Container = styled.div`
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
        <Container>
            <ContentBlock>
                <PageContent>
                    {slice?.items?.map((item, index) => {
                        return (
                            // eslint-disable-next-line react/jsx-no-undef
                            <TextBlockComponent
                                key={index}
                                image={item?.image?.url && item.image as any || undefined}
                                body={asHTML(item?.text) || ''}
                            />
                        );
                    })}
                </PageContent>
            </ContentBlock>
        </Container>
    );
};

export default TextBlock;
