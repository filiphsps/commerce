'use client';

import { FiChevronRight } from 'react-icons/fi';
import NextLink from '@/components/link';
import styled from 'styled-components';
import { usePathname } from 'next/navigation';

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
    margin: 0;
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

type BreadcrumbsProps = {
    store?: any;
};
const Breadcrumbs = ({ store }: BreadcrumbsProps) => {
    const route = usePathname();
    const path = route?.split('/').slice(2, -1);

    if (!path || path.length <= 0) return null;

    return (
        <Container className="Breadcrumbs">
            <Content itemScope itemType="https://schema.org/BreadcrumbList">
                <Item itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                    <Link href="/" itemType="https://schema.org/Thing" itemProp="item" prefetch={false}>
                        <span itemProp="name">{store?.name || store?.title}</span>
                    </Link>
                    <meta itemProp="position" content="1" />
                    <Icon>
                        <FiChevronRight />
                    </Icon>
                </Item>
                {path?.map((entry, index) => (
                    <Item key={entry} itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                        <Link
                            href={`/${path.slice(0, index + 1).join('/')}`}
                            itemType="https://schema.org/Thing"
                            itemProp="item"
                            prefetch={false}
                        >
                            <span itemProp="name">{entry}</span>
                        </Link>
                        <meta itemProp="position" content={`${index + 2}`} />
                        {(index + 1 < path.length && (
                            <Icon>
                                <FiChevronRight />
                            </Icon>
                        )) ||
                            false}
                    </Item>
                ))}
            </Content>
        </Container>
    );
};

export default Breadcrumbs;
