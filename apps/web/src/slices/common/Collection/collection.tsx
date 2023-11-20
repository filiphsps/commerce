'use client';

import Link from '@/components/link';
import PageContent from '@/components/page-content';
import { Title } from '@/components/typography/heading';
import type { StoreModel } from '@/models/StoreModel';
import type { CollectionSliceDefault } from '@/prismic/types';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import type { PrefetchData } from '@/utils/prefetch';
import { asHTML, asText } from '@prismicio/client';
import type { ReactNode } from 'react';
import styled, { css } from 'styled-components';

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

export type CollectionContainerProps = {
    slice: {
        slice_type: 'collection';
        slice_label: null;
        id?: string | undefined;
    } & CollectionSliceDefault;
    store: StoreModel;
    locale: Locale;
    i18n: LocaleDictionary;
    prefetch?: PrefetchData;
    children: ReactNode;
};
export const CollectionContainer = ({ slice, locale, children }: CollectionContainerProps) => {
    return (
        <Container data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
            <PageContent>
                <Content>
                    {asText(slice.primary.title)?.length > 0 && (
                        <Header $alignment={slice.primary.alignment}>
                            <Link
                                href={`/collections/${slice.primary.handle!}`}
                                title={`View all products in "${asText(slice.primary.title)}"`} // TODO: i18n.
                                locale={locale}
                                prefetch={false}
                            >
                                <CollectionTitle
                                    dangerouslySetInnerHTML={{
                                        __html: asHTML(slice.primary.title) || ''
                                    }}
                                />
                            </Link>
                            <Body
                                dangerouslySetInnerHTML={{
                                    __html: asHTML(slice.primary.body) || ''
                                }}
                            />
                        </Header>
                    )}

                    {children}
                </Content>
            </PageContent>
        </Container>
    );
};
