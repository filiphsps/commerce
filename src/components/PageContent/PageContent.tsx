import React, { FunctionComponent } from 'react';
import styled, { css } from 'styled-components';

const Container = styled.div<{ primary?: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-width: var(--page-width);
    width: 100%;
    margin: 0px auto;

    ${({ primary }) =>
        primary &&
        css`
            padding: 1rem;
            gap: 1rem;
        `}
`;

interface PageContentProps {
    style?: any;
    primary?: boolean;
    className?: string;
    children?: any;
}
const PageContent: FunctionComponent<PageContentProps> = (props) => {
    return <Container primary={props.primary}>{props.children}</Container>;
};

export default PageContent;
