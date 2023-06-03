import React, { FunctionComponent, memo } from 'react';

import styled from 'styled-components';

const Wrapper = styled.div``;

// TODO: replace this with generic header component(s).
const Title = styled.h2`
    margin-bottom: 1rem;

    &.no-margin {
        margin-bottom: 0px;
    }

    &:not(.plain-title) {
        color: var(--accent-primary);
    }

    text-transform: uppercase;
    font-size: 2.5rem;
    font-weight: 600;

    @media (max-width: 950px) {
        font-size: 2.25rem;
        font-weight: 700;
    }
`;
const SubTitle = styled.h3`
    color: #404756;
    font-size: 1.75rem;
    line-height: 1.75rem;
    font-weight: 800;

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
            <Wrapper className={`${noMargin ? 'no-margin' : ''}`}>
                <SubTitle className={`${noMargin ? 'no-margin' : ''}`}>{subtitle}</SubTitle>
                <Title className={`${noMargin ? 'no-margin' : ''}`}>{title}</Title>
            </Wrapper>
        );
    return (
        <Wrapper className={`${noMargin ? 'no-margin' : ''}`}>
            <Title
                className={`${(plainTitle && 'plain-title') || ''} ${noMargin ? 'no-margin' : ''}`}
            >
                {title}
            </Title>
            {subtitle && (
                <SubTitle className={`${noMargin ? 'no-margin' : ''}`}>{subtitle}</SubTitle>
            )}
        </Wrapper>
    );
};

export default memo(PageHeader);
