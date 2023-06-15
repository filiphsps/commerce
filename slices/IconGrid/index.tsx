import { Content } from '@prismicio/client';
import Image from 'next/legacy/image';
import PageContent from '../../src/components/PageContent';
import { SliceComponentProps } from '@prismicio/react';
import styled from 'styled-components';

const Container = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(24rem, 1fr));
    gap: 1rem;
`;

const ContentContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 2rem;

    padding: 2rem 1rem;
    margin-bottom: 1rem;
    background: var(--accent-primary);
    border: 0.2rem solid var(--accent-primary-dark);
    color: var(--color-text-primary);

    @media (max-width: 950px) {
        flex-direction: column;
        gap: 1rem;
    }
`;
const Item = styled.div`
    display: grid;
    grid-template-columns: auto 1fr;
    justify-content: center;
    align-items: center;
    gap: 1rem;
`;
const ItemIcon = styled.div`
    position: relative;
    height: 2rem;
    width: 2rem;
    filter: invert(100%);
`;
const ItemContent = styled.h3`
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: 0.05rem;
    text-transform: uppercase;
    text-align: center;

    @media (max-width: 1024px) {
        text-align: left;
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
        <Container>
            <PageContent>
                <ContentContainer>
                    {slice.items.map((item, index) => (
                        <Item key={index}>
                            <ItemIcon>
                                {item.icon?.url && (
                                    <Image
                                        src={item.icon.url}
                                        alt={item.icon.alt ||''}
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
