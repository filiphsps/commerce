import React, { FunctionComponent } from 'react';

import styled from 'styled-components';

const ButtonWrapper = styled.button`
    -webkit-appearance: none;
    appearance: none;
    display: inline-block;
    width: 100%;
    padding: 1rem 1.5rem;
    background-color: var(--accent-primary);
    color: var(--color-text-primary);
    border-radius: var(--block-border-radius);
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: 0.05rem;
    text-align: center;
    cursor: pointer;
    box-shadow: 0px 0px 10px 0px rgba(0, 0, 0, 0.25);
    user-select: none;
    transition: 250ms all ease-in-out;

    &:hover {
        background: var(--accent-primary-light);
    }

    &:active {
        background: var(--accent-primary-dark);
    }

    &.Secondary {
        padding: 0.75rem 1.5rem;
        background: unset;
        border: 0.35rem solid var(--accent-primary);
        color: var(--accent-primary);
        font-weight: 800;

        &:hover {
            background: var(--accent-primary);
            border-color: var(--accent-primary);
            color: var(--color-text-primary);
        }
        &:active {
            color: var(--accent-primary);
            background: var(--color-text-primary);
            border-color: var(--color-text-primary);
        }
    }

    @media (max-width: 950px) {
        font-size: 1.5rem;
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
    title?: string;
    className?: string;
    children?: any;
}
const Button: FunctionComponent<ButtonProps> = ({
    type,
    className,
    disabled,
    onClick,
    children,
    title
}) => {
    return (
        <ButtonWrapper
            type={type}
            className={`Button ${className} ${disabled && 'Button-Disabled'}`}
            onClick={(!disabled && onClick) || null}
            title={title}
        >
            {children}
        </ButtonWrapper>
    );
};

export default Button;
