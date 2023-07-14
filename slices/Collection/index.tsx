import { Content, asHTML, asText } from '@prismicio/client';
import styled, { css } from 'styled-components';

import CollectionBlock from '../../src/components/CollectionBlock';
import Link from 'next/link';
import PageContent from '../../src/components/PageContent';
import { SliceComponentProps } from '@prismicio/react';
import Color from 'color';

const Container = styled.section`
    width: 100%;
    padding: 0px;
    margin: 0px;
`;

const Content = styled.div`
    display: flex;
    flex-direction: column;
    gap: var(--block-padding-large);

    padding: var(--block-padding-large);
    background: var(--background);
    background: linear-gradient(320deg, var(--background) 0%, var(--background-dark) 100%);
    border-radius: var(--block-border-radius);
    color: var(--foreground);
`;

const Header = styled.div<{ alignment: 'left' | 'center' | 'right' }>`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: start;
    gap: 0.5rem;

    ${({ alignment }) =>
        alignment == 'center' &&
        css`
            align-items: center;
            text-align: center;

            @media (max-width: 950px) {
                align-items: start;
                text-align: left;
            }
        `};
`;
const Title = styled.div`
    font-size: 2.25rem;
    line-height: 2.5rem;
    font-weight: 700;
    border-bottom: 0.2rem dotted var(--foreground);
    transition: 250ms ease-in-out;

    &:hover {
        color: var(--accent-primary);
        border-bottom: 0.2rem dotted var(--accent-primary);
    }
`;
const Body = styled.div`
    font-size: 1.75rem;
    line-height: 2rem;
    font-weight: 400;
    max-width: 64rem;
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
        <Container
            style={
                {
                    '--background': slice.primary.accent || 'var(--color-block)',
                    '--background-dark': slice.primary.accent_dark || 'var(--color-block)',
                    '--foreground':
                        (slice.primary.accent &&
                            Color(slice.primary.accent).isDark() &&
                            'var(--color-text-primary)') ||
                        'var(--color-text-dark)'
                } as React.CSSProperties
            }
        >
            <PageContent>
                <Content>
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
                        hideTitle={
                            asText(slice.primary.title).length > 0 || slice.primary.hide_title
                        }
                        plainTitle
                        data={context.prefetch?.collections?.[slice.primary.handle!]}
                        store={context.store}
                    />
                </Content>
            </PageContent>
        </Container>
    );
};

export default Collection;
