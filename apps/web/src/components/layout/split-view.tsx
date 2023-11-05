'use client';

import type { HTMLProps, ReactNode } from 'react';

import { RemoveInvalidProps } from '@/utils/remove-invalid-props';
import { styled } from 'styled-components';

const Container = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: auto auto;
    grid-template-areas: 'aside' 'primary';
    gap: 0;
    width: 100%;
    max-width: var(--page-width);
    margin: 0 auto;
    padding: calc(var(--block-spacer-large) * 2) calc(var(--block-spacer) / 2);

    @media (min-width: 950px) {
        grid-template-columns: 55% auto;
        grid-template-rows: auto;
        grid-template-areas: 'aside primary';
        gap: var(--block-spacer-large);
        max-width: 100%;
        padding: calc(var(--block-spacer-large) * 2) var(--block-spacer);
    }
`;

const Aside = styled.div`
    position: relative;
    grid-area: aside;
    margin: var(--block-spacer);
    margin-top: 0;

    @media (min-width: 950px) {
        margin-right: 0;
        margin: 0 0 0 var(--block-spacer);
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
        margin: 0 var(--block-spacer) 0 0;
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
            <Primary {...RemoveInvalidProps(props)}>{children}</Primary>
        </Container>
    );
};

export default SplitView;
