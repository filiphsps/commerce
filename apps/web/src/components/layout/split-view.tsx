'use client';

import type { HTMLProps, ReactNode } from 'react';

import { styled } from 'styled-components';

const Container = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: auto auto;
    grid-template-areas: 'aside' 'primary';
    gap: 0;
    max-width: var(--page-width);
    width: 100%;
    margin: 0 auto;

    @media (min-width: 950px) {
        grid-template-columns: 60% auto;
        grid-template-rows: auto;
        grid-template-areas: 'aside primary';
        max-width: 100vw;
    }
`;

const Aside = styled.div`
    position: relative;
    grid-area: aside;
    height: 30vh;
    background: var(--color-block);

    @media (min-width: 950px) {
        height: unset;
        padding-left: calc(60vw - calc(var(--page-width) * 0.6) - var(--block-padding-large) * 2);
    }
`;

const Primary = styled.div`
    grid-area: primary;
    display: flex;
    flex-direction: column;
    margin: var(--block-spacer);

    @media (min-width: 950px) {
        padding: var(--block-padding);
        max-width: calc(calc(var(--page-width) * 0.4) - var(--block-padding-large));
    }
`;

type SplitViewProps = {
    children: ReactNode;
    aside: ReactNode;
} & HTMLProps<HTMLDivElement>;
const SplitView = (props: SplitViewProps) => {
    const { aside, children } = props;

    return (
        <Container>
            <Aside>{aside}</Aside>
            <Primary {...props}>{children}</Primary>
        </Container>
    );
};

export default SplitView;
