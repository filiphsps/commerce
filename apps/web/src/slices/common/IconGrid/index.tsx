'use client';

import PageContent from '@/components/PageContent';
import type { Content } from '@prismicio/client';
import type { SliceComponentProps } from '@prismicio/react';
import Image from 'next/legacy/image';
import styled from 'styled-components';

const Container = styled.section`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(24rem, 1fr));
    gap: var(--block-spacer-large);
`;

const ContentContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    gap: calc(var(--block-spacer-large) * 2);

    padding: var(--block-padding-large);
    border-radius: var(--block-border-radius);
    background: var(--accent-primary);
    color: var(--accent-primary-text);

    @media (min-width: 960px) {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        justify-content: center;
        align-items: center;
    }

    @media (max-width: 1465px) {
        flex-direction: column;

        gap: var(--block-spacer-large);
    }
`;
const Item = styled.div`
    display: grid;
    grid-template-columns: calc(var(--block-padding-large) * 2) auto;
    justify-content: center;
    align-items: center;
    gap: calc(var(--block-spacer-large) * 2);
    padding: var(--block-padding);

    @media (min-width: 960px) {
        gap: var(--block-spacer-large);
    }
`;
const ItemIcon = styled.div`
    position: relative;
    height: 2.5rem;
    width: calc(var(--block-padding-large) * 2);
    height: calc(var(--block-padding-large) * 2);

    // TODO: Remove this when the icons are fixed.
    filter: invert(1);
`;
const ItemContent = styled.h3`
    font-size: 1.5rem;
    font-weight: 600;
    line-height: 1.25;
    text-transform: uppercase;
    text-align: left;

    @media (min-width: 960px) {
        font-size: 1.25rem;
    }
`;

/**
 * Props for `IconGrid`.
 */
export type IconGridProps = SliceComponentProps<Content.IconGridSlice>;

/**
 * Component for "IconGrid" Slices.
 */
const IconGrid = ({ slice }: IconGridProps): JSX.Element => {
    return (
        <Container data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
            <PageContent>
                <ContentContainer>
                    {slice.items.map((item, index) => (
                        <Item key={index}>
                            <ItemIcon>
                                {item.icon?.url && (
                                    <Image src={item.icon.url} alt={item.icon.alt || ''} layout="fill" />
                                )}
                            </ItemIcon>
                            <ItemContent>{item.title}</ItemContent>
                        </Item>
                    ))}
                </ContentContainer>
            </PageContent>
        </Container>
    );
};

export default IconGrid;
