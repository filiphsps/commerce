import * as Sentry from '@sentry/nextjs';

import { FiAlignLeft, FiChevronDown, FiSearch, FiShoppingBag, FiX } from 'react-icons/fi';
import React, { FunctionComponent, useEffect, useRef, useState } from 'react';

import { Button } from '../Button';
import { Checkout } from '../../../pages/cart';
import Image from 'next/legacy/image';
import { ImageLoader } from '../../util/ImageLoader';
import { Input } from '../Input';
import Link from 'next/link';
import SearchBar from '../SearchBar';
import { Tag } from '../../../pages/products/[handle]';
import styled from 'styled-components';
import { useCart } from '@shopify/hydrogen-react';
import { useRouter } from 'next/router';
import { useStore } from 'react-context-hook';

const Content = styled.div`
    display: grid;
    grid-template-columns: auto 11.25rem 1fr;
    gap: var(--block-spacer);
    max-width: var(--page-width);
    width: 100%;
    height: auto;
    padding: var(--block-padding);
    margin: 0px auto;
    user-select: none;

    .Icon {
        font-size: 2.5rem;
        line-height: 2.5rem;
    }

    @media (min-width: 950px) {
        grid-template-columns: 10rem 1fr auto;
        gap: var(--block-spacer-large);
        height: calc(4.5rem + calc(var(--block-padding) * 2));
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
    gap: var(--block-spacer-large);
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

        &:hover,
        &:active,
        &.Active {
            color: var(--accent-primary);
            /*text-decoration: underline;
            text-decoration-style: dotted;
            text-decoration-thickness: 0.2rem;
            text-underline-offset: var(--block-border-width);*/
        }

        &.Active {
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

const SearchIcon = styled.div`
    height: 100%;
    width: 5rem;

    @media (min-width: 950px) {
        display: none;
    }
`;
const CartIconWrapper = styled.div`
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    width: 5rem;

    background: var(--accent-primary);
    border-radius: var(--block-border-radius);
    color: var(--accent-primary-text);
    cursor: pointer;
    transition: 250ms all ease-in-out;

    &:hover {
        background: var(--accent-secondary);
        color: var(--accent-secondary-text);
    }

    @media (min-width: 950px) {
        .Icon {
            font-size: 2.5rem;
            width: 4rem;
        }
    }
`;
const CartIcon = styled.span`
    position: absolute;
    right: 0.75rem;
    top: 0.75rem;
    height: 1rem;
    width: 1rem;

    background: var(--accent-secondary);
    border-radius: 100%;
`;

const CartPopup = styled.section`
    z-index: 999;
    position: absolute;
    display: grid;
    width: 32rem;
    padding: 1.5rem;
    right: -0.5rem;
    top: 8rem;
    background: var(--accent-secondary-light);
    color: var(--color-dark);
    border-radius: var(--block-border-radius);
    box-shadow: 0px 0px 1rem 0px var(--color-block-shadow);
    grid-template-rows: auto 1fr auto;
    gap: var(--block-spacer);
    opacity: 0;
    transition: 250ms ease-in-out;
    pointer-events: none;

    @media (min-width: 950px) {
        width: 36rem;
    }

    &.Open {
        opacity: 1;
        pointer-events: unset;
    }
`;
const CartPopupItem = styled.div`
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--block-spacer);
    justify-content: center;
    align-items: center;
    margin-bottom: 1rem;
`;
const CartPopupItemHeader = styled.div`
    display: grid;
    justify-content: center;
    align-items: center;
    grid-template-columns: 1fr 2rem;
    gap: 0px;
    margin-bottom: 1rem;
    color: var(--accent-primary-text);
    background: var(--accent-primary);
    padding: 1.25rem 1.5rem;
    border-radius: var(--block-border-radius);
    box-shadow: 0px 0px 1rem 0px var(--color-block-shadow);

    svg {
        font-size: 2rem;
    }
`;
const CartPopupItemTitle = styled.div`
    font-size: 1.25rem;
    line-height: 1.25rem;
    font-weight: 700;
    text-align: left;

    span {
        display: inline-block;
        font-size: 1.5rem;
    }
`;
const CartPopupItemImageWrapper = styled.div`
    background: var(--color-bright);
    border-radius: var(--block-border-radius);
    overflow: hidden;
    height: 100%;
    padding: var(--block-padding-large);
    box-shadow: 0px 0px 1rem 0px var(--color-block-shadow);
`;
const CartPopupItemImage = styled.div`
    position: relative;
    width: 6rem;
    min-height: 6rem;
    height: 100%;

    img {
        height: 100%;
        width: 100%;
        object-fit: contain;
    }
`;
const CartPopupItemMeta = styled.div`
    display: grid;
    grid-template-rows: auto 1fr auto;
    gap: 0px;
    flex-direction: column;
    justify-content: start;
    width: 100%;
    height: 100%;
    padding: var(--block-padding-large);
    background: var(--accent-primary-text);
    border-radius: var(--block-border-radius);
    box-shadow: 0px 0px 1rem 0px var(--color-block-shadow);
`;
const CartPopupItemMetaVendor = styled.div`
    font-size: 1.25rem;
    font-weight: 600;
    opacity: 0.75;
    color: var(--color-block);
`;
const CartPopupItemMetaTitle = styled.div`
    margin-bottom: 1rem;
    font-size: 2.15rem;
    line-height: 2.25rem;
    font-weight: 600;
    color: var(--accent-primary);
`;
const CartPopupItemMetaVariant = styled.div`
    display: flex;
    align-items: flex-end;
`;
const CartPopupContent = styled.div`
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--block-spacer);
    width: 100%;

    button {
        box-shadow: 0px 0px 1rem 0px var(--color-block-shadow);
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

const Header = styled.header`
    display: grid;
    top: 8rem;
    width: 100%;
    background: var(--accent-secondary-light);
    border-bottom: 0.05rem solid var(--accent-secondary);
    box-shadow: 0px 1rem 1rem -1rem var(--color-block-shadow);
`;

interface HeaderProps {
    store?: any;
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
    const [beginCheckout, setBeginCheckout] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [cartStore, setCartStore] = useStore<any>('cart');
    const timer: any = useRef(null);

    useEffect(() => {
        if (searchOpen && router.route === '/search') setSearchOpen(false);
    }, [router.route]);

    useEffect(() => {
        if (router.asPath === '/cart/') return setCartStore({ ...cartStore, open: false });

        if (timer.current) clearTimeout(timer.current);

        if (cartStore.open) {
            timer.current = setTimeout(() => {
                if (!cartStore.open) return;
                setCartStore({ ...cartStore, open: false });
            }, 5000);
        }

        return () => {
            clearInterval(timer.current);
            timer.current = null;
        };
    }, [cart.lines]);

    return (
        <Header className="Modern">
            <Content>
                <HamburgerMenu onClick={() => sidebarToggle?.()}>
                    {sidebarOpen ? <FiX className="Icon" /> : <FiAlignLeft className="Icon" />}
                </HamburgerMenu>

                <Logo>
                    <Link href={'/'}>
                        <Image src={store?.logo?.src} layout="fill" alt="Logo" />
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
                    <SearchBar open={searchOpen && router.route !== '/search'} />
                    <SearchIcon>
                        <CartIconWrapper
                            onClick={() =>
                                setSearchOpen((router.route !== '/search' && !searchOpen) || false)
                            }
                        >
                            <FiSearch className="Icon" />
                        </CartIconWrapper>
                    </SearchIcon>
                    <CartIconWrapper className={(cart?.totalQuantity || 0) > 0 ? 'Active' : ''}>
                        <Link href={'/cart/'} className="Wrapper">
                            {(cart?.totalQuantity || 0) > 0 && <CartIcon />}
                            <FiShoppingBag className="Icon" />
                        </Link>

                        {cartStore.item ? (
                            <CartPopup
                                className={
                                    ((cartStore.open || beginCheckout) &&
                                        router.asPath !== '/cart/' &&
                                        'Open') ||
                                    ''
                                }
                            >
                                <CartPopupItemHeader>
                                    <CartPopupItemTitle>
                                        <span>✓</span> Added to the cart
                                    </CartPopupItemTitle>
                                    <FiX
                                        style={{ cursor: 'pointer' }}
                                        onClick={() =>
                                            setCartStore({
                                                ...cartStore,
                                                open: false
                                            })
                                        }
                                    />
                                </CartPopupItemHeader>
                                <CartPopupItem>
                                    <CartPopupItemImageWrapper>
                                        <CartPopupItemImage>
                                            <Image
                                                src={cartStore.item.images[0].src}
                                                layout="fill"
                                                loader={ImageLoader}
                                            />
                                        </CartPopupItemImage>
                                    </CartPopupItemImageWrapper>
                                    <CartPopupItemMeta>
                                        <CartPopupItemMetaVendor>
                                            {cartStore.item.vendor}
                                        </CartPopupItemMetaVendor>
                                        <CartPopupItemMetaTitle>
                                            {cartStore.item.title}
                                        </CartPopupItemMetaTitle>
                                        <CartPopupItemMetaVariant>
                                            <Tag>{cartStore.item.variant.title}</Tag>
                                        </CartPopupItemMetaVariant>
                                    </CartPopupItemMeta>
                                </CartPopupItem>
                                <CartPopupContent>
                                    <Link
                                        href="/cart/"
                                        onClick={() => {
                                            setCartStore({
                                                ...cartStore,
                                                open: false
                                            });
                                        }}
                                    >
                                        <Button className="Secondary" disabled={beginCheckout}>
                                            View cart
                                        </Button>
                                    </Link>
                                    <Button
                                        disabled={beginCheckout}
                                        onClick={async () => {
                                            try {
                                                if (beginCheckout) return;

                                                setBeginCheckout(true);

                                                await Checkout({
                                                    cart,
                                                    locale: router.locale
                                                });
                                            } catch (error) {
                                                Sentry.captureException(error);
                                                console.error(error);
                                                alert(error.message);
                                                setBeginCheckout(false);
                                            }
                                        }}
                                    >
                                        Checkout
                                    </Button>
                                </CartPopupContent>
                            </CartPopup>
                        ) : null}
                    </CartIconWrapper>
                </Actions>
            </Content>
        </Header>
    );
};

export default HeaderComponent;
