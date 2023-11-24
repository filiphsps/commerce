import type { CSSProperties, FunctionComponent } from 'react';

import Content from '@/components/Content';
import styled from 'styled-components';

const Container = styled.div`
    grid-area: page-header;
    display: flex;
    flex-direction: column;
    gap: var(--block-spacer-small);
    color: var(--foreground);
    padding: var(--padding);
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

    ${Content as any} a, a {
        display: inline-block;
        transition: 250ms ease-in-out all;
        cursor: pointer;
        color: var(--foreground);

        @media (hover: hover) and (pointer: fine) {
            &:hover,
            :focus {
                text-decoration: underline;
                text-decoration-style: dotted;
                text-decoration-thickness: 0.2rem;
                text-underline-offset: var(--block-border-width);
            }
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
    padding?: string;

    className?: string;
    style?: CSSProperties;
}
const PageHeader: FunctionComponent<PageHeaderProps> = ({
    title,
    subtitle,
    reverse,
    foreground,
    padding,

    className,
    style
}) => {
    return (
        <Container
            className={className}
            style={
                {
                    ...(style || {}),
                    '--foreground': foreground || 'var(--color-dark)',
                    '--padding': padding || '0px'
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

export default PageHeader;
