import React, { FunctionComponent, memo } from 'react';

import Link from 'next/link';
import styled from 'styled-components';
import { useRouter } from 'next/router';

const Container = styled.div`
    overflow-y: scroll;
    position: fixed;
    top: 6.5rem;
    height: calc(100% - 6.5rem);
    width: 65%;
    padding: 2rem;
    background: #fefefe;
    border-bottom: 0.5rem solid var(--accent-primary);
    box-shadow: 0px 5px 10px 0px rgba(0, 0, 0, 0.25);
    transition: 250ms ease-in-out;

    left: calc(-65% - 4rem);
    &.Open {
        left: 0px;
    }

    @media (min-width: 950px) {
        display: none;
    }
`;

const Navigation = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;
    height: 100%;
    width: 100%;
`;
const NavigationItem = styled.div`
    padding-bottom: 1.5rem;
    font-size: 2rem;
    text-transform: uppercase;

    a {
        transition: 250ms ease-in-out;
    }

    a.Active {
        color: var(--accent-primary);
        font-weight: 700;
    }
`;
const NavigationSubItem = styled.div`
    padding: 1rem 0px 0px 1rem;
    font-size: 1.75rem;
`;

interface HeaderNavigationProps {
    navigation: any;
    open: boolean;
    toggle: any;
}
const HeaderNavigation: FunctionComponent<HeaderNavigationProps> = ({
    navigation,
    open,
    toggle
}) => {
    const router = useRouter();

    return (
        <Container className={open ? 'Open' : ''}>
            <Navigation>
                {navigation?.map((item: any) => {
                    return (
                        <NavigationItem key={item.handle}>
                            <Link href={`/${item.handle || ''}`}>
                                <a
                                    className={
                                        (router.asPath === '/' &&
                                            item?.handle === null) ||
                                        `/${item?.handle}` === router.asPath
                                            ? 'Active'
                                            : ''
                                    }
                                    onClick={toggle}
                                >
                                    {item.title}
                                </a>
                            </Link>
                            {item.children.map((item) => (
                                <NavigationSubItem key={item.handle}>
                                    <Link href={`/${item.handle || ''}`}>
                                        <a
                                            className={
                                                (router.asPath === '/' &&
                                                    item?.handle === null) ||
                                                `/${item?.handle}` ===
                                                    router.asPath
                                                    ? 'Active'
                                                    : ''
                                            }
                                            onClick={toggle}
                                        >
                                            {item.title}
                                        </a>
                                    </Link>
                                </NavigationSubItem>
                            ))}
                        </NavigationItem>
                    );
                })}
            </Navigation>
        </Container>
    );
};

export default memo(HeaderNavigation);
