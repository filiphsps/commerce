import { Content } from '@prismicio/client';
import Image from 'next/legacy/image';
import PageContent from '@/components/PageContent';
import { SliceComponentProps } from '@prismicio/react';
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
    gap: var(--block-spacer-large);

    padding: var(--block-padding-large);
    border-radius: var(--block-border-radius);
    background: var(--accent-secondary);
    color: var(--accent-secondary-text);

    @media (min-width: 960px) {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        justify-content: center;
        align-items: center;
    }
    @media (max-width: 1465px) {
        flex-direction: column;

        gap: var(--block-spacer);
    }
`;
const Item = styled.div`
    display: grid;
    grid-template-columns: var(--block-spacer-large) auto;
    justify-content: center;
    align-items: center;
    gap: var(--block-spacer-large);
    padding: var(--block-padding-small);
`;
const ItemIcon = styled.div`
    position: relative;
    height: 2rem;
    width: 2rem;
`;
const ItemContent = styled.h3`
    font-size: 1.25rem;
    font-weight: 700;
    text-transform: uppercase;
    text-align: center;

    @media (max-width: 1465px) {
        text-align: left;
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
        <Container>
            <PageContent>
                <ContentContainer>
                    {slice.items.map((item, index) => (
                        <Item key={index}>
                            <ItemIcon>
                                {item.icon?.url && (
                                    <Image
                                        src={item.icon.url}
                                        alt={item.icon.alt || ''}
                                        layout="fill"
                                    />
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
