'use client';

import type { ReactNode } from 'react';
import { styled } from 'styled-components';

const Container = styled.section`
    display: flex;
    flex-direction: column;
    gap: var(--block-spacer-small);
`;

export const Title = styled.h1`
    font-size: 3rem;
    line-height: 0.95;
    font-weight: 400;
`;

export const SubTitle = styled.h2`
    font-size: 2.25rem;
    line-height: 1;
    font-weight: 700;
`;

type HeadingProps = {
    title: ReactNode;
    subtitle: ReactNode;
    reverse?: boolean;
};
const Heading = ({ title, subtitle, reverse }: HeadingProps) => {
    return (
        <Container>
            {!reverse ? <Title>{title}</Title> : <SubTitle>{subtitle}</SubTitle>}
            {reverse ? <Title>{title}</Title> : <SubTitle>{subtitle}</SubTitle>}
        </Container>
    );
};

export default Heading;
