import { FiChevronRight } from 'react-icons/fi';
import type { FunctionComponent } from 'react';
import NextLink from 'next/link';
import styled from 'styled-components';

const Container = styled.nav`
    z-index: 999;
    overflow: hidden;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    display: flex;
    flex-wrap: nowrap;
    justify-content: flex-start;
    align-items: center;
    margin-top: var(--block-spacer);
    color: var(--color-dark);
    border-radius: var(--block-border-radius);
    font-size: 1.5rem;
    line-height: 1.75rem;
    font-weight: 600;
`;

const Content = styled.ol`
    display: flex;
    justify-content: flex-start;
    align-items: center;
    margin: 0px;
    list-style-type: none;
`;

const Link = styled(NextLink)`
    display: flex;
    height: 100%;
    color: var(--accent-primary-dark);

    span {
        display: block;
        height: 100%;
    }

    @media (hover: hover) and (pointer: fine) {
        &:hover,
        &:active {
            color: var(--accent-secondary-dark);
        }
    }
`;

const Item = styled.li`
    display: flex;
    flex-wrap: nowrap;
    justify-content: start;
    align-items: center;
    width: 100%;
    white-space: nowrap;
    cursor: pointer;

    &:last-child {
        ${Link} {
            font-weight: 800;
            color: var(--accent-secondary-dark);
        }
    }
`;

// Optically balance margin-bottom,
// See https://medium.com/design-bridges/optical-effects-9fca82b4cd9a
const Icon = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;

    svg {
        display: block;
        font-size: 1.5rem;
        margin-bottom: -0.05rem;
    }
`;

interface BreadcrumbsProps {
    pages?: {
        title: React.ReactNode;
        url: string;
    }[];
    store?: any;
    country?: string;
}
const Breadcrumbs: FunctionComponent<BreadcrumbsProps> = (props) => {
    const { store } = props;

    // FIXME: We shouldn't require suppressHydrationWarning
    return (
        <Container className="Breadcrumbs">
            <Content itemScope itemType="https://schema.org/BreadcrumbList" suppressHydrationWarning>
                <Item
                    itemProp="itemListElement"
                    itemScope
                    itemType="https://schema.org/ListItem"
                    suppressHydrationWarning
                >
                    <Link href="/" itemType="https://schema.org/Thing" itemProp="item" prefetch={false}>
                        <span itemProp="name">{store?.name || store?.title}</span>
                    </Link>
                    <meta itemProp="position" content="1" />
                    <Icon>
                        <FiChevronRight />
                    </Icon>
                </Item>
                {props?.pages?.map((item: any, index: any) => {
                    // FIXME: Hotfix.
                    if (item.url.includes('undefined') || item.url.includes('handle')) return null;

                    return (
                        <Item
                            key={item.title}
                            itemProp="itemListElement"
                            itemScope
                            itemType="https://schema.org/ListItem"
                            suppressHydrationWarning
                        >
                            <Link
                                href={item.url || ''}
                                itemType="https://schema.org/Thing"
                                itemProp="item"
                                prefetch={false}
                            >
                                <span itemProp="name">{item.title}</span>
                            </Link>
                            <meta itemProp="position" content={index + 2} />
                            {(index + 1 < props?.pages!.length && (
                                <Icon>
                                    <FiChevronRight />
                                </Icon>
                            )) ||
                                false}
                        </Item>
                    );
                })}
            </Content>
        </Container>
    );
};

export default Breadcrumbs;
