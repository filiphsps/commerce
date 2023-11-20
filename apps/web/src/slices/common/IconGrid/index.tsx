'use client';

import PageContent from '@/components/page-content';
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
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: calc(var(--block-spacer-large) * 1.5);

    padding: var(--block-padding-large);
    border-radius: var(--block-border-radius);
    background: var(--accent-primary);
    color: var(--accent-primary-text);

    @media (min-width: 960px) {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        justify-content: center;
        align-items: center;
        gap: calc(var(--block-spacer-large) * 2);
    }
`;
const Item = styled.div`
    display: grid;
    grid-template-columns: calc(var(--block-padding-large) * 2) auto;
    justify-content: center;
    align-items: center;
    gap: var(--block-spacer-large);
`;
const ItemIcon = styled.div`
    position: relative;
    width: calc(var(--block-padding-large) * 2);
    height: calc(var(--block-padding-large) * 2);

    // TODO: Remove this when the icons are fixed.
    filter: invert(1);
`;
const ItemContent = styled.h3`
    font-size: 1.35rem;
    font-weight: 500;
    text-transform: uppercase;
    text-align: left;
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
