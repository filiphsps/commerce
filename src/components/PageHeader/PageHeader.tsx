import React, { FunctionComponent, memo } from 'react';

import styled from 'styled-components';

const Content = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: var(--block-padding-large);
    border-radius: var(--block-border-radius);
    background: var(--background);
    background: linear-gradient(320deg, var(--background) 0%, var(--background-dark) 100%);
    color: var(--foreground);
    box-shadow: 0px 0px 10px 0px rgba(0, 0, 0, 0.25);
`;

export const Title = styled.h2`
    font-size: 2.5rem;
    line-height: 3rem;
    font-weight: 700;
`;
export const Subtitle = styled.h3`
    font-size: 1.75rem;
    line-height: 2.25rem;
    font-weight: 400;

    a {
        display: inline-block;
        transition: 250ms ease-in-out all;
        cursor: pointer;
        border-bottom: 0.2rem dotted var(--foreground);
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
    background?: string;
    backgroundDark?: string;
    foreground?: string;
}
const PageHeader: FunctionComponent<PageHeaderProps> = ({
    title,
    subtitle,
    reverse,
    background,
    backgroundDark,
    foreground
}) => {
    return (
        <Content
            style={
                {
                    '--foreground': foreground || 'var(--color-text-primary)',
                    '--background': background || 'var(--accent-primary)',
                    '--background-dark': backgroundDark || 'var(--accent-primary-dark)'
                } as React.CSSProperties
            }
        >
            {(reverse && (
                <>
                    <Subtitle>{subtitle}</Subtitle>
                    <Title>{title}</Title>
                </>
            )) || (
                <>
                    <Title>{title}</Title>
                    {subtitle && <Subtitle>{subtitle}</Subtitle>}
                </>
            )}
        </Content>
    );
};

export default memo(PageHeader);
