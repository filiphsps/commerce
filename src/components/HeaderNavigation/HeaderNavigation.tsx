import React, { FunctionComponent, memo } from 'react';

import Link from 'next/link';
import styled from 'styled-components';
import { useRouter } from 'next/router';

const Container = styled.div`
    position: absolute;
    top: 6.5rem;
    z-index: 99999;
    width: 80vw;
    width: 80dvw;
    height: calc(100vh - 10.5rem);
    height: calc(100dvh - 10.5rem);
    background: var(--color-text-primary);
    color: var(--color-text-dark);
    transition: 250ms ease-in-out;

    left: -100vw;
    &.Open {
        left: 0px;
    }

    @media (min-width: 950px) {
        display: none;
    }
`;

const Navigation = styled.div`
    overflow-y: scroll;
    overscroll-behavior-y: auto;
    display: flex;
    flex-direction: column;
    gap: 2rem;
    height: 100%;
    width: 100%;
    padding: 2rem;
`;
const NavigationItem = styled.div`
    display: flex;
    flex-direction: column;
    align-items: start;
    gap: 0.75rem;
    width: 100%;
    font-size: 2.5rem;
    line-height: 2.75rem;
    font-weight: 700;

    a {
        transition: 250ms ease-in-out;
    }

    a.Active {
        color: var(--accent-primary);
        font-weight: 700;
    }

    a:hover {
        color: var(--accent-primary);
    }
`;
const NavigationSubItem = styled.div`
    font-size: 2.25rem;
    line-height: 2.5rem;
    font-weight: 500;

    &:last-child {
        padding-bottom: 0.5rem;
    }
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
        <Container
            className={`${open ? 'Open' : ''} Modern`}
            onClick={(e) => {
                e.stopPropagation();
            }}
        >
            <Navigation>
                {navigation?.map((item: any, index) => {
                    return (
                        <NavigationItem key={item.handle + `_${index}`}>
                            <Link
                                href={`/${item.handle || ''}`}
                                title={item.title}
                                className={
                                    (router.asPath === '/' && item?.handle === null) ||
                                    `/${item?.handle}` === router.asPath
                                        ? 'Active'
                                        : ''
                                }
                                onClick={() => toggle(false)}
                            >
                                {item.title}
                            </Link>
                            {item.children.map((item, index) => (
                                <NavigationSubItem key={item.handle + `_${index}`}>
                                    <Link
                                        href={`/${item.handle || ''}`}
                                        title={item.title}
                                        className={
                                            (router.asPath === '/' && item?.handle === null) ||
                                            `/${item?.handle}` === router.asPath
                                                ? 'Active'
                                                : ''
                                        }
                                        onClick={() => toggle(false)}
                                    >
                                        {item.title}
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
