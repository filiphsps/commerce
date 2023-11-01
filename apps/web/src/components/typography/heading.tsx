'use client';

import type { ReactNode } from 'react';
import { styled } from 'styled-components';

const Container = styled.section``;

const Title = styled.h1`
    font-size: 3rem;
    line-height: 3.25rem;
    font-weight: 700;
`;

const SubTitle = styled.h2`
    font-size: 2rem;
    line-height: 2.25rem;
    font-weight: 500;
`;

type HeadingProps = {
    title: ReactNode;
    subtitle: ReactNode;
};
const Heading = ({ title, subtitle }: HeadingProps) => {
    return (
        <Container>
            <SubTitle>{subtitle}</SubTitle>
            <Title>{title}</Title>
        </Container>
    );
};

export default Heading;
