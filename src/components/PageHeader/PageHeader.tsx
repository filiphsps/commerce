import React, { FunctionComponent, memo } from 'react';

import styled from 'styled-components';

const Wrapper = styled.div`
    margin-bottom: 1rem;
`;

// TODO: replace this with generic header component(s).
const Title = styled.h2`
    margin: 0px 0px 0.75rem -0.05rem;
    text-transform: uppercase;
    font-weight: 900;
    font-size: 2.75rem;
    line-height: 2.75rem;

    color: #404756;
    &:not(.plain-title) {
        color: var(--accent-primary);
    }

    @media (max-width: 950px) {
        font-size: 3rem;
        line-height: 3rem;
    }
`;
const SubTitle = styled.h3`
    margin: -0.5rem 0px 2rem 0px;
    color: #404756;
    font-size: 1.65rem;
    font-weight: 700;
    line-height: 2rem;

    &.no-margin {
        margin: 0px;
    }

    a {
        transition: 150ms ease-in-out all;
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
    noMargin?: boolean;
}
const PageHeader: FunctionComponent<PageHeaderProps> = ({
    title,
    subtitle,
    reverse,
    plainTitle,
    noMargin
}) => {
    if (reverse)
        return (
            <Wrapper>
                <SubTitle className={noMargin ? 'no-margin' : ''}>
                    {subtitle}
                </SubTitle>
                <Title>{title}</Title>
            </Wrapper>
        );
    return (
        <Wrapper>
            <Title className={(plainTitle && 'plain-title') || ''}>
                {title}
            </Title>
            {subtitle && (
                <SubTitle className={noMargin ? 'no-margin' : ''}>
                    {subtitle}
                </SubTitle>
            )}
        </Wrapper>
    );
};

export default memo(PageHeader);
