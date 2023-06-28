import { Content, asHTML, asText } from '@prismicio/client';
import styled, { css } from 'styled-components';

import CollectionBlock from '../../src/components/CollectionBlock';
import Link from 'next/link';
import PageContent from '../../src/components/PageContent';
import { SliceComponentProps } from '@prismicio/react';

const Container = styled.section`
    width: 100%;
    padding: 0px;
    margin: 0px;

    @media (max-width: 950px) {
        overflow: hidden;

        .CollectionBlock-Horizontal {
            width: 100vw;

            .CollectionBlock-Content {
                margin-left: -1.5rem;
                padding-left: 1.5rem;
                scroll-padding-inline-start: 1.5rem;
                scroll-padding-inline-end: 1.5rem;
            }
        }
    }
`;

const Header = styled.div<{ alignment: 'left' | 'center' | 'right' }>`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: start;
    gap: 0.5rem;
    padding: 1rem 0px;

    @media (max-width: 950px) {
        padding: 1rem 0px 0.5rem 0px;
    }

    ${({ alignment }) =>
        alignment == 'center' &&
        css`
            margin-bottom: 1.25rem;
            align-items: center;
            text-align: center;

            @media (max-width: 950px) {
                align-items: start;
                text-align: left;
            }
        `};
`;
const Title = styled.div`
    text-transform: uppercase;
    font-size: 2rem;
    font-weight: 700;
    letter-spacing: 0.1rem;

    @media (max-width: 950px) {
        font-size: 2.25rem;
    }
`;
const Body = styled.div`
    font-size: 2rem;
    line-height: 2.5rem;
    max-width: 64rem;

    @media (max-width: 950px) {
        font-size: 1.75rem;
        line-height: 2.25rem;
    }
`;

/**
 * Props for `Collection`.
 */
export type CollectionProps = SliceComponentProps<Content.CollectionSlice, any>;

/**
 * Component for "Collection" Slices.
 */
const Collection = ({ slice, context }: CollectionProps): JSX.Element => {
    return (
        <Container>
            <PageContent>
                {asText(slice.primary.title).length > 0 && (
                    <Header alignment={slice.primary.alignment}>
                        <Link href={`/collections/${slice.primary.handle!}`}>
                            {' '}
                            <Title
                                dangerouslySetInnerHTML={{
                                    __html: asHTML(slice.primary.title)
                                }}
                            />
                        </Link>
                        <Body
                            dangerouslySetInnerHTML={{
                                __html: asHTML(slice.primary.body)
                            }}
                        />
                    </Header>
                )}
                <CollectionBlock
                    handle={slice.primary.handle!}
                    isHorizontal={slice.primary.direction === 'horizontal'}
                    limit={slice.primary.limit || 16}
                    hideTitle={asText(slice.primary.title).length > 0 || slice.primary.hide_title}
                    plainTitle
                    data={context.prefetch?.collections?.[slice.primary.handle!]}
                    store={context.store}
                />
            </PageContent>
        </Container>
    );
};

export default Collection;
