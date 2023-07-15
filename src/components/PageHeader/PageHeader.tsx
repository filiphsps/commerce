import React, { FunctionComponent, memo } from 'react';

import styled from 'styled-components';

const Content = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0rem;
    padding: var(--block-padding-large);
    border-radius: var(--block-border-radius);
    background: var(--background);
    color: var(--foreground);
`;

export const Title = styled.h2`
    font-size: 2.5rem;
    line-height: 2.75rem;
    font-weight: 700;
`;
export const Subtitle = styled.h3`
    font-size: 1.75rem;
    line-height: 2rem;
    font-weight: 400;

    a {
        display: inline-block;
        transition: 250ms ease-in-out all;
        cursor: pointer;

        &:hover,
        :focus {
            text-decoration: underline;
            text-decoration-style: dotted;
            text-decoration-thickness: 0.2rem;
            text-underline-offset: var(--block-border-width);
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
    foreground
}) => {
    return (
        <Content
            style={
                {
                    '--foreground': foreground || 'var(--accent-primary-text)',
                    '--background': background || 'var(--accent-primary)'
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
