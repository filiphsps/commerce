import { Content, asHTML, asText } from '@prismicio/client';
import styled, { css } from 'styled-components';

import CollectionBlock from '../../src/components/CollectionBlock';
import Link from 'next/link';
import PageContent from '../../src/components/PageContent';
import { SliceComponentProps } from '@prismicio/react';
import Color from 'color';
import { Title } from '../../src/components/PageHeader/PageHeader';

const Container = styled.section`
    width: 100%;
    padding: 0px;
    margin: 0px;
`;

const Content = styled.div`
    display: flex;
    flex-direction: column;
    gap: var(--block-spacer-large);

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
    gap: var(--block-spacer-small);

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
const CollectionTitle = styled(Title)`
    font-size: 2.25rem;
    line-height: 2.5rem;
    transition: 250ms ease-in-out;

    text-decoration: underline;
    text-decoration-style: dotted;
    text-decoration-thickness: 0.2rem;
    text-underline-offset: var(--block-border-width);

    &:hover {
        color: var(--accent-primary);
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
                            'var(--color-bright)') ||
                        'var(--color-dark)'
                } as React.CSSProperties
            }
        >
            <PageContent>
                <Content>
                    {asText(slice.primary.title).length > 0 && (
                        <Header alignment={slice.primary.alignment}>
                            <Link href={`/collections/${slice.primary.handle!}`}>
                                <CollectionTitle
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
