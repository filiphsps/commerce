import React, { FunctionComponent } from 'react';

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
    font-weight: 700;
    letter-spacing: 0.05rem;
    text-transform: uppercase;
    text-align: center;
    cursor: pointer;
    box-shadow: 0px 0px 10px -5px rgba(0, 0, 0, 0.25);
    user-select: none;
    transition: 250ms all ease-in-out;

    @media (max-width: 950px) {
        font-size: 1.5rem;
    }

    &:hover {
        background: var(--accent-primary-light);
    }

    &:active {
        background: var(--accent-primary-dark);
    }

    &.Button-Disabled {
        background: rgba(0, 0, 0, 0.15) !important;
        box-shadow: none;
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
            className={`Button ${props.className} ${
                props.disabled && 'Button-Disabled'
            }`}
            onClick={(!props.disabled && props.onClick) || null}
        >
            {props.children}
        </ButtonWrapper>
    );
};

export default Button;
