import { FiShoppingCart, FiUser } from 'react-icons/fi';
import React, { FunctionComponent, useEffect } from 'react';

import { Config } from '../../util/Config';
import Image from 'next/image';
import Link from 'next/link';
import SearchBar from '../SearchBar';
import styled from 'styled-components';
import { useCart } from 'react-use-cart';
import { useRouter } from 'next/router';

const Header = styled.header`
    display: flex;
    justify-content: center;
    align-items: center;
    background: #fefefe;
    border-bottom: 0.5rem solid var(--accent-primary);

    @media (max-width: 950px) {
        border-bottom: none;
        box-shadow: none;
    }
`;
const Content = styled.div`
    display: grid;
    justify-content: center;
    align-items: center;
    grid-template-columns: auto 1fr 1fr;
    gap: 4rem;
    max-width: 1465px;
    width: 100%;
    padding: 0.75rem 1.5rem;

    @media (max-width: 950px) {
        grid-template-columns: auto 1fr;
    }
`;
const Logo = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 1rem;
    cursor: pointer;
    background: var(--accent-primary);
    border-radius: var(--block-border-radius);

    div {
        position: relative;
        height: 2.5rem;
        width: 7rem;
    }
`;
const Navigation = styled.nav`
    display: flex;
    justify-content: flex-start;
    align-items: center;
    gap: 1.5rem;
    text-transform: uppercase;
    font-size: 1.5rem;
    letter-spacing: 0.05rem;

    @media (max-width: 950px) {
        display: none;
    }

    a {
        transition: 250ms all ease-in-out;
        cursor: pointer;
        border-bottom: solid 0.2rem transparent;
        transform: translateY(0.2rem);
        transition: 250ms ease-in-out;

        &:hover,
        &:active {
            border-bottom: solid 0.2rem var(--accent-primary);
            transform: translateY(0px);
        }

        &.Active {
            color: var(--accent-primary);
            font-weight: 700;
        }
    }
`;
const Actions = styled.div`
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 1rem;

    .SearchBar {
        max-width: 24rem;
        input {
            height: 3.25rem;
            border-radius: var(--block-border-radius);
            color: #0e0e0e;
        }
    }
`;

const CartIconWrapper = styled.div`
    div {
        display: flex;
        justify-content: center;
        align-items: center;
        position: relative;
        padding: 0.5rem 1rem;
        border-radius: 1.5rem;
        cursor: pointer;
        border: 0.2rem solid #404756;
    }

    .Icon {
        font-size: 1.75rem;
        line-height: 75px;
        cursor: pointer;
        transition: 250ms all ease-in-out;

        &:hover,
        &:active {
            transform: scale(1.15);
            color: rgba(255, 255, 255, 0.5);
        }
    }

    &.Active {
        .Icon {
            margin-left: 0.75rem;
        }

        div {
            background: #fefefe;
            color: #0e0e0e;
            box-shadow: 0px 0px 10px -5px rgba(0, 0, 0, 0.25);

            &:hover,
            &:active {
                background: var(--accent-secondary-dark);
                color: var(--color-text-primary);

                .Icon {
                    color: var(--color-text-primary);
                    transform: none;
                }
            }
        }
    }
`;
const CartIcon = styled.span`
    font-size: 1.25rem;
    font-weight: 700;
    text-align: center;
    transition: 250ms all ease-in-out;
`;

interface HeaderProps {
    store?: any;
    navigation?: any;
}
const HeaderComponent: FunctionComponent<HeaderProps> = ({
    store,
    navigation
}) => {
    const cart = useCart();
    const router = useRouter();

    useEffect(() => {
        cart.items.forEach((item) => {
            if (!item.id.includes('/')) return;

            // Clear cart if we find old product ids
            cart.emptyCart();
        });
    }, []);

    return (
        <Header>
            <Content>
                <Logo>
                    <div>
                        <Link href={'/'}>
                            <Image src={store?.logo?.src} layout="fill" />
                        </Link>
                    </div>
                </Logo>

                <Navigation>
                    {navigation?.map((item: any, index: number) => {
                        return (
                            <Link key={index} href={`/${item?.handle || ''}`}>
                                <a
                                    className={
                                        (router.asPath === '/' &&
                                            item?.handle === null) ||
                                        `/${item?.handle}` === router.asPath
                                            ? 'Active'
                                            : ''
                                    }
                                >
                                    {item?.title}
                                </a>
                            </Link>
                        );
                    })}
                </Navigation>

                <Actions>
                    <SearchBar />
                    <div>
                        {Config.features.accounts && (
                            <Link href={'/account'}>
                                <FiUser className="Icon" />
                            </Link>
                        )}

                        <CartIconWrapper
                            className={cart?.totalItems > 0 ? 'Active' : ''}
                        >
                            <Link href={'/cart'}>
                                <div>
                                    {cart?.totalItems > 0 && (
                                        <CartIcon className="Header-Content-CartBadge">
                                            {cart.totalItems}
                                        </CartIcon>
                                    )}
                                    <FiShoppingCart className="Icon" />
                                </div>
                            </Link>
                        </CartIconWrapper>
                    </div>
                </Actions>
            </Content>
        </Header>
    );
};

export default HeaderComponent;
