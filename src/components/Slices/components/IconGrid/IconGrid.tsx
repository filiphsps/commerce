import React, { FunctionComponent, memo } from 'react';

import Image from 'next/image';
import PageContent from '../../../PageContent';
import styled from 'styled-components';

const Content = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 2rem;

    padding: 2rem 1rem;
    margin-bottom: 1rem;
    background: var(--accent-primary);
    border: 0.2rem solid var(--accent-primary-dark);
    color: var(--color-text-primary);

    &.Secondary {
        background: var(--accent-secondary);
        border: 0.2rem solid var(--accent-secondary-dark);
    }

    @media (max-width: 950px) {
        flex-direction: column;
    }
`;
const Item = styled.div`
    display: grid;
    grid-template-columns: auto 1fr;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
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
`;

interface IconGridProps {
    data: {
        primary: {
            secondary: boolean;
        };
        items: Array<{
            icon?: {
                alt?: string;
                url: string;
            };
            title1: Array<{
                text: string;
            }>;
        }>;
    };
}
const IconGrid: FunctionComponent<IconGridProps> = ({ data }) => {
    return (
        <div className="Slice Slice-IconGrid">
            <PageContent>
                <Content
                    className={data.primary.secondary ? 'Secondary' : 'Primary'}
                >
                    {data.items.map((item, index) => (
                        <Item key={index}>
                            <ItemIcon>
                                {item.icon?.url && (
                                    <Image
                                        src={item.icon.url}
                                        alt={item.icon.alt}
                                        layout="fill"
                                    />
                                )}
                            </ItemIcon>
                            <ItemContent
                                dangerouslySetInnerHTML={{
                                    __html: item.title1[0].text
                                }}
                            />
                        </Item>
                    ))}
                </Content>
            </PageContent>
        </div>
    );
};

export default memo(IconGrid);
