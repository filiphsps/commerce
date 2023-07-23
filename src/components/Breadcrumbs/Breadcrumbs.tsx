import { FiChevronRight } from 'react-icons/fi';
import { FunctionComponent } from 'react';
import NextLink from 'next/link';
import dynamic from 'next/dynamic';
import styled from 'styled-components';

const SocialShare = dynamic(() => import('../SocialShare'), { ssr: false });

const Container = styled.nav`
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
    line-height: 1.5px;
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

    &:hover,
    &:active {
        color: var(--accent-secondary-dark);
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

const Icon = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;

    svg {
        display: block;
        font-size: 1.5rem;
        // Optically balance it,
        // See https://medium.com/design-bridges/optical-effects-9fca82b4cd9a
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
    hideSocial?: boolean;
}
const Breadcrumbs: FunctionComponent<BreadcrumbsProps> = (props) => {
    const { store, hideSocial = true } = props;

    return (
        <Container className="Breadcrumbs">
            <Content itemScope itemType="https://schema.org/BreadcrumbList">
                <Item itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                    <Link href="/" itemType="https://schema.org/Thing" itemProp="item">
                        <span itemProp="name">{store?.name || store?.title}</span>
                    </Link>
                    <meta itemProp="position" content="1" />
                    <Icon>
                        <FiChevronRight />
                    </Icon>
                </Item>
                {props?.pages?.map((item: any, index: any) => {
                    // FIXME: Hotfix.
                    if (item.url.includes('undefined')) return null;

                    return (
                        <Item
                            key={item.title}
                            itemProp="itemListElement"
                            itemScope
                            itemType="https://schema.org/ListItem"
                        >
                            <Link
                                href={item.url}
                                itemType="https://schema.org/Thing"
                                itemProp="item"
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
            {!hideSocial && <SocialShare />}
        </Container>
    );
};

export default Breadcrumbs;
