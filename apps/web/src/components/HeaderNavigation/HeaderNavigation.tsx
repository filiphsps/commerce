import type { FunctionComponent } from 'react';
import Link from '@/components/link';
import styled from 'styled-components';
import { usePathname } from 'next/navigation';

const Container = styled.div`
    position: absolute;
    top: 6.5rem;
    z-index: 99999;
    width: 80vw;
    width: 80dvw;
    height: calc(100vh - 12.5rem);
    height: calc(100dvh - 12.5rem);
    background: var(--accent-secondary-light);
    color: var(--color-dark);
    transition: 150ms ease-in-out;

    left: -100vw;
    &.Open {
        left: 0;
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
    gap: calc(var(--block-spacer-large) * 2);
    height: 100%;
    width: 100%;
    padding: 2rem;
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
    open: boolean;
    toggle: any;
}
const HeaderNavigation: FunctionComponent<HeaderNavigationProps> = ({ navigation, open, toggle }) => {
    const route = usePathname();

    return (
        <Container
            className={`${open ? 'Open' : ''} Modern`}
            onClick={(e) => {
                e.stopPropagation();
            }}
        >
            <Navigation>
                {navigation?.map((item: any, index: number) => {
                    return (
                        <NavigationItem key={item.handle + `_${index}`}>
                            <Link
                                href={`/${item.handle || ''}`}
                                title={item.title}
                                className={
                                    (route === '/' && item?.handle === null) || `/${item?.handle}` === route
                                        ? 'Active'
                                        : ''
                                }
                                onClick={() => toggle(false)}
                                prefetch={false}
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
                                        onClick={() => toggle(false)}
                                        prefetch={false}
                                    >
                                        <NavigationSubItemTitle>{item.title}</NavigationSubItemTitle>

                                        {item.description && (
                                            <NavigationSubItemDescription>
                                                {item.description}
                                            </NavigationSubItemDescription>
                                        )}
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

export default HeaderNavigation;
