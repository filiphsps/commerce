import React, { FunctionComponent, memo } from 'react';

import { HeaderApi } from '../../api/header';
import { HeaderStyle } from '../Header/Header';
import Link from 'next/link';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import useSWR from 'swr';

const Blur = styled.div`
    position: fixed;
    top: 6.5rem;
    bottom: 0px;

    background: transparent;
    width: 200vw;
    width: 200dvw;
    height: calc(100% - 6.5rem);
    height: calc(100dvh - 6.5rem);
    transition: 150ms ease-in-out;
    pointer-events: none;

    &.Modern {
        top: 5.5rem;
        height: calc(100% - 6rem);
        height: calc(100dvh - 6rem);
    }

    left: -100vw;
    left: -100dvw;
    &.Open {
        left: 0px;
        overflow: hidden;
        background: rgba(0, 0, 0, 0.45);
        pointer-events: all;
    }
`;

const Container = styled.div`
    z-index: 99999;
    overflow-y: scroll;
    height: 100%;
    width: 70vw;
    width: 70dvw;
    min-width: 28rem;
    padding: 2rem;
    background: #fefefe;
    border-bottom: 0.5rem solid var(--accent-primary);
    box-shadow: 0px 5px 10px 0px rgba(0, 0, 0, 0.25);
    transition: 150ms ease-in-out;

    left: calc(-70vw - 4rem);
    left: calc(-70dvw - 4rem);
    &.Open {
        left: 0px;
    }
    &.Modern {
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
    padding-bottom: 1.75rem;
    font-size: 2rem;
    font-weight: 600;
    line-height: 2rem;
    text-transform: uppercase;

    a {
        transition: 150ms ease-in-out;
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
    padding: 1rem 0px 0px 1rem;
    font-size: 1.75rem;
    line-height: 1.75rem;
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
    const { data } = useSWR(['header'], () => HeaderApi(router.locale) as any);

    // TODO: Switch-case
    const headerStyle =
        data?.style?.toLowerCase() === 'modern'
            ? HeaderStyle.Modern
            : HeaderStyle.Simple;

    return (
        <Blur
            className={`${open ? 'Open' : ''} ${headerStyle}`}
            onClick={(e) => {
                toggle(false);
                return false;
            }}
        >
            <Container
                className={`${open ? 'Open' : ''} ${headerStyle}`}
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
                                        (router.asPath === '/' &&
                                            item?.handle === null) ||
                                        `/${item?.handle}` === router.asPath
                                            ? 'Active'
                                            : ''
                                    }
                                    onClick={() => toggle(false)}
                                >
                                    {item.title}
                                </Link>
                                {item.children.map((item, index) => (
                                    <NavigationSubItem
                                        key={item.handle + `_${index}`}
                                    >
                                        <Link
                                            href={`/${item.handle || ''}`}
                                            title={item.title}
                                            className={
                                                (router.asPath === '/' &&
                                                    item?.handle === null) ||
                                                `/${item?.handle}` ===
                                                    router.asPath
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
        </Blur>
    );
};

export default memo(HeaderNavigation);
