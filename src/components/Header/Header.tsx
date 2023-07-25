import { FiAlignLeft, FiChevronDown, FiSearch, FiShoppingBag, FiX } from 'react-icons/fi';
import { FunctionComponent, useEffect, useState } from 'react';
import styled, { css } from 'styled-components';

import Image from 'next/image';
import { ImageLoader } from '../../util/ImageLoader';
import { Input } from '../Input';
import Link from 'next/link';
import { Pluralize } from '../../util/Pluralize';
import type { StoreModel } from 'src/models/StoreModel';
import { useCart } from '@shopify/hydrogen-react';
import { useRouter } from 'next/router';

const Content = styled.div`
    display: grid;
    grid-template-columns: auto 11.25rem 1fr;
    gap: var(--block-spacer);
    max-width: var(--page-width);
    width: 100%;
    height: 100%;
    padding: var(--block-padding) var(--block-spacer-large);
    margin: 0px auto;
    user-select: none;

    @media (min-width: 950px) {
        grid-template-columns: 10rem 1fr auto;
        gap: var(--block-spacer-large);
    }
`;

const Logo = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 4.5rem;
    padding: 0.5rem 0.25rem;
    background: var(--accent-primary);
    border-radius: var(--block-border-radius);
    user-select: none;

    a {
        position: relative;
        display: block;
        height: 100%;
        width: 100%;

        img {
            height: 100%;
            width: 100%;
            object-fit: contain;
        }
    }

    @media (min-width: 950px) {
        padding: 0.25rem 0.75rem;
        height: 100%;
    }
`;

const Menu = styled.div`
    z-index: 9999;
    overflow: hidden;
    position: absolute;
    top: 6rem;
    left: 0px;
    right: 0px;
    max-height: 0px;
    transition: 250ms ease-in-out;
    border-color: var(--accent-secondary);
    background: var(--accent-secondary-light);
    color: var(--color-dark);
    box-shadow: 0px 1rem 1rem -1rem var(--color-block-shadow);
    cursor: unset;

    &:hover {
        max-height: 100vh;
    }
`;
const MenuContent = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
    gap: var(--block-spacer-large);
    padding: 2rem 2rem 1rem 2rem;
    max-width: 1465px;
    margin: 0px auto;
`;
const MenuItemTitle = styled.div`
    font-weight: 500;
`;
const MenuItemDescription = styled.div`
    font-weight: 500;
    font-size: 1.25rem;
    text-transform: none;
    opacity: 0.75;
    margin-top: 0.5rem;
`;
const MenuItem = styled.div`
    margin-bottom: var(--block-spacer);
    transition: 250ms ease-in-out;

    &.Active,
    &:hover {
        ${MenuItemTitle} {
            font-weight: 700;
        }
    }
`;

const Navigation = styled.nav`
    display: flex;
    justify-content: flex-start;
    align-items: center;
    gap: calc(var(--block-spacer) * 2);
    margin-left: var(--block-spacer);
    height: 100%;
    font-weight: 500;
    font-size: 1.75rem;
    line-height: 1.75rem;
    color: var(--color-dark);

    @media (max-width: 950px) {
        display: none;
    }

    a {
        cursor: pointer;

        @media (hover: hover) and (pointer: fine) {
            &:hover,
            &:active,
            &.Active {
                color: var(--accent-primary);
            }
        }

        &.Active {
            color: var(--accent-primary);
            text-decoration: underline;
            text-decoration-style: solid;
            text-decoration-thickness: 0.2rem;
            text-underline-offset: var(--block-border-width);
            font-weight: 700;
        }
    }
`;
const NavigationItem = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    gap: var(--block-spacer-small);
    height: 100%;
    cursor: pointer;

    svg {
        display: inline-block;
        height: 2rem;
        font-size: 1.25rem;
        line-height: 100%;
        vertical-align: middle;
    }

    a {
        text-transform: uppercase;

        &.Top {
            display: flex;
            justify-content: start;
            align-items: center;
            text-transform: uppercase;
            gap: 0.25rem;
            text-transform: unset;
        }
    }

    &:hover ${Menu} {
        max-height: 100vh;
        border-bottom: 0.05rem solid var(--accent-secondary);
    }
`;
const NavigationViewAll = styled.div`
    svg {
        font-size: 2rem;
        stroke-width: 0.24ex;
    }
`;

const Actions = styled.div`
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: var(--block-spacer);

    .SearchBar {
        max-width: 24rem;

        ${Input} {
            height: 100%;
            border-radius: var(--block-border-radius);
            color: var(--color-dark);
        }
    }
`;

const Action = styled.div`
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    width: 5rem;

    border-radius: var(--block-border-radius);
    background: var(--accent-primary);
    color: var(--accent-secondary-light);
    cursor: pointer;
    transition: 250ms all ease-in-out;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            background: var(--accent-secondary);
            color: var(--accent-secondary-text);
        }
    }

    font-weight: 600;
    line-height: 1.25rem;
    font-size: 1.25rem;

    svg {
        font-size: 2.5rem;
    }
`;

const CartIndicator = styled.span`
    position: absolute;
    display: flex;
    justify-content: center;
    align-items: center;
    right: calc(var(--block-spacer-small) * -1);
    top: calc(var(--block-spacer-small) * -1);
    height: 2rem;
    width: 2rem;
    aspect-ratio: 1 / 1;

    background: var(--accent-secondary);
    color: var(--accent-secondary-text);
    border-radius: 100%;

    pointer-events: none;

    @media (min-width: 950px) {
        right: calc(var(--block-spacer-small) * -0.5);
        top: calc(var(--block-spacer-small) * -0.5);
    }
`;

const HamburgerMenu = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    width: 5rem;
    cursor: pointer;
    background: var(--accent-primary);
    border-radius: var(--block-border-radius);
    color: var(--accent-primary-text);

    svg.Icon {
        font-size: 3rem;
        line-height: 3rem;
    }

    @media (min-width: 950px) {
        display: none;
    }
`;

const Header = styled.header<{ scrolled?: boolean }>`
    display: grid;
    width: 100%;
    background: var(--accent-secondary-light);
    transition: 250ms ease-in-out background-color;
    border-bottom: calc(var(--block-border-width) / 2) solid transparent;

    ${({ scrolled }) =>
        scrolled &&
        css`
            border-bottom-color: var(--accent-secondary);
            box-shadow: 0px 1rem 1rem -0.5rem var(--color-block-shadow);
        `}

    @media (min-width: 950px) {
        height: calc(4.5rem + calc(var(--block-padding) * 2));
    }
`;

interface HeaderProps {
    store?: StoreModel;
    navigation?: any;
    sidebarToggle?: any;
    sidebarOpen?: boolean;
}
const HeaderComponent: FunctionComponent<HeaderProps> = ({
    store,
    navigation,
    sidebarToggle,
    sidebarOpen
}) => {
    const cart = useCart();
    const router = useRouter();
    const [searchOpen, setSearchOpen] = useState(false);
    const [scrollTop, setScrollTop] = useState(0);

    useEffect(() => {
        if (searchOpen && router.route === '/search') setSearchOpen(false);
    }, [router.route]);

    useEffect(() => {
        const onScroll = (event: any) => {
            // https://sweet-side-of-sweden.sentry.io/share/issue/63f138af22f04dbfa157185337d5261b/
            if (!event?.target?.documentElement?.scrollTo) return;

            setScrollTop(event?.target?.documentElement?.scrollTop);
        };
        window.addEventListener('scroll', onScroll);

        return () => window.removeEventListener('scroll', onScroll);
    }, [scrollTop]);

    return (
        <Header className="Modern" scrolled={scrollTop >= 40}>
            <Content>
                <HamburgerMenu onClick={() => sidebarToggle?.()}>
                    {sidebarOpen ? <FiX className="Icon" /> : <FiAlignLeft className="Icon" />}
                </HamburgerMenu>

                <Logo>
                    <Link href={'/'}>
                        <Image
                            src={store?.logo?.src!}
                            width={250}
                            height={150}
                            alt={`Store logo`}
                            sizes="(max-width: 950px) 75px, 250px"
                            loader={ImageLoader}
                        />
                    </Link>
                </Logo>

                <Navigation>
                    {navigation?.map((item: any, index) => {
                        return (
                            <NavigationItem key={item.handle + `${index}`}>
                                <Link
                                    href={`/${item?.handle || ''}`}
                                    title={item.title}
                                    className={`Top ${
                                        (router.asPath === '/' && item?.handle === null) ||
                                        `/${item?.handle}` === router.asPath
                                            ? 'Active'
                                            : ''
                                    }`}
                                >
                                    {item?.title || null}
                                    {(item?.children?.length > 0 && (
                                        <NavigationViewAll>
                                            <FiChevronDown />
                                        </NavigationViewAll>
                                    )) ||
                                        null}
                                </Link>
                                {(item.children.length && (
                                    <Menu>
                                        <MenuContent>
                                            {item.children.map((item, index) => (
                                                <MenuItem
                                                    key={item.handle + `${index}`}
                                                    className={
                                                        (router.asPath === '/' &&
                                                            item?.handle === null) ||
                                                        `/${item?.handle}` === router.asPath
                                                            ? 'Active'
                                                            : ''
                                                    }
                                                >
                                                    <Link
                                                        href={`/${item?.handle || ''}`}
                                                        title={item.title}
                                                    >
                                                        <MenuItemTitle>{item.title}</MenuItemTitle>
                                                        {item.description && (
                                                            <MenuItemDescription>
                                                                {item.description}
                                                            </MenuItemDescription>
                                                        )}
                                                    </Link>
                                                </MenuItem>
                                            ))}
                                        </MenuContent>
                                    </Menu>
                                )) ||
                                    null}
                            </NavigationItem>
                        );
                    })}
                </Navigation>

                <Actions>
                    <Action>
                        <Link
                            href={'/search/'}
                            className="Wrapper"
                            title="Search for products, collections and pages across the whole store"
                        >
                            <FiSearch />
                        </Link>
                    </Action>
                    <Action className={(cart?.totalQuantity || 0) > 0 ? 'Active' : ''}>
                        <Link
                            href={'/cart/'}
                            className="Wrapper"
                            title={`There are ${cart?.totalQuantity || 0} ${Pluralize({
                                count: cart?.totalQuantity || 0,
                                noun: 'item'
                            })} in your cart`}
                        >
                            {!!cart?.totalQuantity && (
                                <CartIndicator>{cart?.totalQuantity}</CartIndicator>
                            )}
                            <FiShoppingBag />
                        </Link>
                    </Action>
                </Actions>
            </Content>
        </Header>
    );
};

export default HeaderComponent;
