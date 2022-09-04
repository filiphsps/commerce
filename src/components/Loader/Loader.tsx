import React, { FunctionComponent, memo } from 'react';

import styled from 'styled-components';

const Wrapper = styled.div`
    width: 6rem;
    height: 6rem;
    margin: 0px auto;
    background: #efefef;
    -webkit-animation: sk-rotateplane 1.2s infinite ease-in-out;
    animation: sk-rotateplane 1.2s infinite ease-in-out;

    &.Light {
        background: #fefefe;
    }
`;

interface LoaderProps {
    light?: boolean;
}
const Loader: FunctionComponent<LoaderProps> = (props) => {
    return <Wrapper className={props.light ? 'Light' : ''}></Wrapper>;
};

export default memo(Loader);
