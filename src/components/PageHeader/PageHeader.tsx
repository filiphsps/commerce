import React, { FunctionComponent, memo } from 'react';

import Content from '../Content';
import styled from 'styled-components';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: var(--block-spacer-small);
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

    ${Content} a, a {
        display: inline-block;
        transition: 250ms ease-in-out all;
        cursor: pointer;
        color: var(--foreground);

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
        <Container
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
        </Container>
    );
};

export default memo(PageHeader);
