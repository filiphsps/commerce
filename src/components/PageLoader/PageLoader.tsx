import type { FunctionComponent } from 'react';
import Loader from '@/components/Loader';
import { styled } from '@linaria/react';

const Wrapper = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: var(--block-padding-large);
`;

interface PageLoaderProps {
    light?: boolean;
}
const PageLoader: FunctionComponent<PageLoaderProps> = ({ light }) => {
    return (
        <Wrapper className="PageLoader">
            <Loader light={light} />
        </Wrapper>
    );
};

export default PageLoader;
