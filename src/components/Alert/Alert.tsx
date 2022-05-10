import React, { FunctionComponent } from 'react';

import styled from 'styled-components';

const AlertWrapper = styled.div`
    z-index: $int-max;
    width: auto;
    max-width: calc(100vw - 16rem);
    padding: 2rem;
    color: var(--color-text-primary);
    background-color: var(--accent-secondary);
    border-radius: var(--block-border-radius);
    font-size: 1.25rem;
    font-weight: 700;
    text-transform: uppercase;
    cursor: pointer;
`;

interface AlertProps {
    message?: any;
    options?: any;
    style?: any;
    close?: any;
}
const Alert: FunctionComponent<AlertProps> = (props) => {
    return (
        <AlertWrapper
            className={` Alert-${props?.options?.type}`}
            style={{ ...props.style }}
            onClick={props.close}
        >
            <div className="Alert-Content">{props.message}</div>
        </AlertWrapper>
    );
};

export default Alert;
