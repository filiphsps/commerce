import styled, { css } from 'styled-components';

import type { FunctionComponent } from 'react';

const Container = styled.div<{ $primary?: boolean }>`
    display: flex;
    flex-direction: column;
    gap: var(--block-spacer-small);
    max-width: var(--page-width);
    width: 100%;
    margin: 0px auto;

    .BlackFriday & {
        color: #ccc;
    }

    ${({ $primary }) =>
        $primary &&
        css`
            padding: calc(var(--block-spacer-large) * 2) var(--block-spacer-large);
            gap: calc(var(--block-spacer-large) * 2);

            .BlackFriday & {
                padding: var(--block-spacer-large) var(--block-spacer);
            }
        `}
`;

interface PageContentProps {
    style?: any;
    primary?: boolean;
    className?: string;
    children?: any;
    id?: string;
}
const PageContent: FunctionComponent<PageContentProps> = ({ style, primary, className, children, id }) => {
    return <Container {...{ style, className, children, id }} $primary={primary} />;
};

export default PageContent;
