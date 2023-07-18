import styled from 'styled-components';

export const Input = styled.input`
    appearance: none;
    width: 100%;
    padding: var(--block-padding) var(--block-padding-large);
    border: var(--block-border-width) solid var(--color-bright);
    border-radius: var(--block-border-radius);
    color: var(--color-dark);
    background: var(--color-bright);
    font-size: 1.25rem;
    line-height: 1.25rem;
    font-weight: 600;
    outline: none;

    @media (max-width: 950px) {
        font-size: 1.5rem;
        padding: var(--block-padding-small) var(--block-padding);
    }

    &:active,
    &:focus,
    &:hover {
        outline: none;
        border-color: var(--accent-primary);
    }

    ::placeholder {
        color: var(--color-dark);
        opacity: 0.5;
        font-weight: 500;
    }

    ::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button {
        appearance: none;
        margin: 0;
    }

    &[type='number'] {
        appearance: textfield;
    }

    &[type='range'] {
        padding: 0px;
    }

    &:disabled,
    &[disabled] {
        border-color: var(--color-block);
        background: var(--color-block);
        color: var(--color-gray);
        cursor: not-allowed;
        opacity: 0.75;
    }
`;

export const MultilineInput = styled.textarea`
    appearance: none;
    width: 100%;
    padding: var(--block-padding-small);
    border: var(--block-border-width) solid var(--color-bright);
    border-radius: var(--block-border-radius);
    color: var(--color-dark);
    background: var(--color-bright);
    font-size: 1.25rem;
    line-height: 1.5rem;
    font-weight: 600;
    outline: none;
    resize: none;

    @media (max-width: 950px) {
        font-size: 1.5rem;
        line-height: 1.75rem;
    }

    &:active,
    &:focus,
    &:hover {
        outline: none;
        border-color: var(--accent-primary);
    }

    ::placeholder {
        color: var(--color-dark);
        opacity: 0.5;
        font-weight: 500;
    }

    ::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button {
        appearance: none;
        margin: 0;
    }

    &[type='number'] {
        appearance: textfield;
    }

    &[type='range'] {
        padding: 0px;
    }

    &:disabled,
    &[disabled] {
        border-color: var(--color-block);
        background: var(--color-block);
        color: var(--color-gray);
        cursor: not-allowed;
        opacity: 0.75;
    }
`;
