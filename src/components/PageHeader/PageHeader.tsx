import React, { FunctionComponent, memo } from 'react';

import styled from 'styled-components';

const Wrapper = styled.div`
    margin-bottom: 1rem;
`;

// TODO: replace this with generic header component(s).
const Title = styled.h2`
    margin: 0px 0px 0.75rem -0.05rem;
    text-transform: uppercase;
    font-weight: 600;
    font-size: 2.45rem;

    color: #404756;
    &:not(.plain-title) {
        color: var(--accent-primary);
    }
`;
const SubTitle = styled.h3`
    color: #404756;
    text-transform: uppercase;
    font-weight: 500;
    font-size: 1.75rem;
    line-height: 2rem;
    margin-left: 0.05rem;

    a {
        transition: 250ms ease-in-out all;
        cursor: pointer;

        &:hover,
        :focus {
            color: var(--accent-primary-dark);
        }
    }
`;

interface PageHeaderProps {
    title: string | JSX.Element;
    subtitle?: string | JSX.Element;
    reverse?: boolean;
    plainTitle?: boolean;
}
const PageHeader: FunctionComponent<PageHeaderProps> = ({
    title,
    subtitle,
    reverse,
    plainTitle
}) => {
    if (reverse)
        return (
            <Wrapper>
                <SubTitle>{subtitle}</SubTitle>
                <Title>{title}</Title>
            </Wrapper>
        );

    return (
        <Wrapper>
            <Title className={plainTitle && 'plain-title'}>{title}</Title>
            {subtitle && <SubTitle>{subtitle}</SubTitle>}
        </Wrapper>
    );
};

export default memo(PageHeader);
