import type { FunctionComponent } from 'react';
import { styled } from '@linaria/react';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: var(--block-spacer-small);
    max-width: var(--page-width);
    width: 100%;
    margin: 0px auto;

    &.primary {
        padding: calc(var(--block-spacer-large) * 2) var(--block-spacer-large);
        gap: calc(var(--block-spacer-large) * 2);
    }
`;

interface PageContentProps {
    style?: any;
    primary?: boolean;
    className?: string;
    children?: any;
    id?: string;
}
const PageContent: FunctionComponent<PageContentProps> = ({ style, primary, className, children, id }) => {
    return (
        <Container
            {...{ style, className, children, id }}
            className={`${className || ''} ${(primary && 'primary') || ''}`}
        />
    );
};

export default PageContent;
