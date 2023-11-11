'use client';

import Link from '@/components/link';
import { usePathname } from 'next/navigation';
import type { FunctionComponent } from 'react';
import styled from 'styled-components';

const Navigation = styled.div`
    overflow-y: scroll;
    overscroll-behavior-y: auto;
    display: flex;
    flex-direction: column;
    gap: calc(var(--block-spacer-large) * 2);
    height: 100%;
    width: 100%;
    width: 100vw;
    padding: 2rem 3rem 4rem 3rem;
`;
const NavigationItem = styled.div`
    display: flex;
    flex-direction: column;
    align-items: start;
    gap: calc(var(--block-spacer-large) * 1.5);
    width: 100%;
    font-size: 2.5rem;
    line-height: 2.75rem;
    font-weight: 700;

    a {
        transition: 150ms ease-in-out;
    }

    a.Active {
        color: var(--accent-primary);
        font-weight: 700;
    }
`;
const NavigationSubItem = styled.div`
    padding-left: calc(var(--block-spacer-large) * 1.5);
    font-size: 2.25rem;
    line-height: 2.5rem;

    &:last-child {
        padding-bottom: 0.5rem;
    }
`;
const NavigationSubItemTitle = styled.div`
    font-weight: 500;
`;
const NavigationSubItemDescription = styled.div`
    font-weight: 500;
    font-size: 1.5rem;
    line-height: 1.75rem;
    opacity: 0.75;
    margin-top: 0.25rem;
    max-width: 60vw;
`;

interface HeaderNavigationProps {
    navigation: any;
}
const HeaderNavigation: FunctionComponent<HeaderNavigationProps> = ({ navigation }) => {
    const route = usePathname();

    return (
        <Navigation>
            {navigation?.map((item: any, index: number) => {
                return (
                    <NavigationItem key={item.handle + `_${index}`}>
                        <Link
                            href={`/${item.handle || ''}`}
                            title={item.title}
                            className={
                                (route === '/' && item?.handle === null) || `/${item?.handle}` === route ? 'Active' : ''
                            }
                            onClick={() => document.body.removeAttribute('data-menu-open')}
                        >
                            {item.title}
                        </Link>
                        {item.children.map((item: any, index: number) => (
                            <NavigationSubItem key={item.handle + `_${index}`}>
                                <Link
                                    href={`/${item.handle || ''}`}
                                    title={item.title}
                                    className={
                                        (route === '/' && item?.handle === null) || `/${item?.handle}` === route
                                            ? 'Active'
                                            : ''
                                    }
                                    onClick={() => document.body.removeAttribute('data-menu-open')}
                                >
                                    <NavigationSubItemTitle>{item.title}</NavigationSubItemTitle>

                                    {item.description && (
                                        <NavigationSubItemDescription>{item.description}</NavigationSubItemDescription>
                                    )}
                                </Link>
                            </NavigationSubItem>
                        ))}
                    </NavigationItem>
                );
            })}
        </Navigation>
    );
};

export default HeaderNavigation;
