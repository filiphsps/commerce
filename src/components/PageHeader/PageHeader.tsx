import React, { FunctionComponent, memo } from 'react';

import styled from 'styled-components';

const Content = styled.div`
    display: flex;
    flex-direction: column;
    color: var(--color-text-primary);
    padding: var(--block-padding-large);
    border-radius: var(--block-border-radius);
    background: var(--background);
    background: linear-gradient(320deg, var(--background) 0%, var(--background-dark) 100%);
    box-shadow: 0px 0px 10px 0px rgba(0, 0, 0, 0.25);
`;

const Title = styled.h2`
    font-size: 2.5rem;
    line-height: 2.75rem;
    font-weight: 700;
`;
const SubTitle = styled.h3`
    font-size: 1.75rem;
    line-height: 2rem;
    font-weight: 400;

    a {
        display: inline-block;
        transition: 150ms ease-in-out all;
        cursor: pointer;
        border-bottom: 0.2rem dotted var(--color-text-primary);
        margin-bottom: 0.25rem;

        &:hover,
        :focus {
            color: var(--accent-secondary-dark);
            border-bottom-color: var(--accent-secondary-dark);
        }
    }
`;

interface PageHeaderProps {
    title?: string | JSX.Element | null;
    subtitle?: string | JSX.Element | null;
    reverse?: boolean;
}
const PageHeader: FunctionComponent<PageHeaderProps> = ({ title, subtitle, reverse }) => {
    return (
        <Content
            style={
                {
                    '--background': 'var(--accent-primary)',
                    '--background-dark': 'var(--accent-primary-dark)'
                } as React.CSSProperties
            }
        >
            {(reverse && (
                <>
                    <SubTitle>{subtitle}</SubTitle>
                    <Title>{title}</Title>
                </>
            )) || (
                <>
                    <Title>{title}</Title>
                    {subtitle && <SubTitle>{subtitle}</SubTitle>}
                </>
            )}
        </Content>
    );
};

export default memo(PageHeader);
