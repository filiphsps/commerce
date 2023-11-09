'use client';

import { Content, asHTML, asText } from '@prismicio/client';
import styled, { css } from 'styled-components';

import CollectionBlock from '@/components/CollectionBlock';
import PageContent from '@/components/PageContent';
import Link from '@/components/link';
import { Title } from '@/components/typography/heading';
import type { SliceComponentProps } from '@prismicio/react';
import { FullCollection } from './FullCollection';

const Container = styled.section`
    width: 100%;
    padding: 0;
    margin: 0;
`;

const Content = styled.div`
    display: flex;
    flex-direction: column;
    gap: var(--block-spacer-large);

    padding: var(--block-padding-large);
    background: var(--color-block);
    border-radius: var(--block-border-radius);
    color: var(--foreground);
`;

const Header = styled.div<{ $alignment: 'left' | 'center' | 'right' }>`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: start;
    gap: var(--block-spacer-small);

    ${({ $alignment }) =>
        $alignment == 'center' &&
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
    transition: 150ms ease-in-out;

    text-decoration: underline;
    text-decoration-style: dotted;
    text-decoration-thickness: 0.2rem;
    text-underline-offset: var(--block-border-width);

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            color: var(--accent-primary);
        }
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
    switch (slice.variation) {
        case 'default':
            return (
                <Container data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
                    <PageContent>
                        <Content>
                            {asText(slice.primary.title)?.length > 0 && (
                                <Header $alignment={slice.primary.alignment}>
                                    <Link
                                        href={`/collections/${slice.primary.handle!}`}
                                        title={`View all products in "${asText(slice.primary.title)}"`} // TODO: i18n.
                                        prefetch={false}
                                    >
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
                                isHorizontal={slice.primary.direction === 'horizontal'}
                                limit={slice.primary.limit || 16}
                                data={context?.prefetch?.collections?.[slice.primary.handle!]}
                                showViewAll={true}
                                store={context?.store}
                                locale={context.locale}
                                i18n={context.i18n}
                            />
                        </Content>
                    </PageContent>
                </Container>
            );

        case 'full':
            return (
                <FullCollection
                    slice={slice}
                    prefetch={context.prefetch}
                    store={context.store}
                    locale={context.locale}
                    i18n={context.i18n}
                />
            );
        default:
            throw new Error('500: Invalid variant');
    }
};

export default Collection;
