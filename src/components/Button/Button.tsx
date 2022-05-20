import React, { FunctionComponent, memo } from 'react';

import styled from 'styled-components';

const ButtonWrapper = styled.button`
    -webkit-appearance: none;
    appearance: none;
    display: inline-block;
    width: 100%;
    padding: 1em 2em;
    background-color: var(--accent-primary);
    color: var(--color-text-primary);
    border-radius: var(--block-border-radius);
    font-size: 1.25rem;
    font-weight: 600;
    letter-spacing: 0.05rem;
    text-transform: uppercase;
    text-align: center;
    cursor: pointer;
    user-select: none;
    transition: 250ms;

    &:hover,
    &:active {
        background: $color-primary-light !important;
        color: $color-text-primary;
    }

    &.Button-Disabled {
        background: rgba(0, 0, 0, 0.15) !important;
        color: $color-dark;
        cursor: not-allowed;
    }
`;

interface ButtonProps {
    disabled?: boolean;
    onClick?: any;
    type?: any;

    className?: string;
    children?: any;
}
const Button: FunctionComponent<ButtonProps> = (props) => {
    return (
        <ButtonWrapper
            type={props.type}
            className={`${props.className} ${
                props.disabled && 'Button-Disabled'
            }`}
            onClick={(!props.disabled && props.onClick) || null}
        >
            {props.children}
        </ButtonWrapper>
    );
};

export default memo(Button);
