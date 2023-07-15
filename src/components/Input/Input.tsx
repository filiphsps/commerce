import styled from 'styled-components';

const Input = styled.input`
    -webkit-appearance: none;
    max-width: 100%;
    padding: var(--block-padding-large);
    border: 0.2rem solid var(--accent-primary);
    border-radius: var(--block-border-radius);
    color: var(--color-text-dark);
    background: var(--color-text-primary);
    font-size: 1.25rem;
    line-height: 1.5rem;
    font-weight: 600;
    outline: none;

    ::placeholder {
        color: var(--color-text-dark);
        opacity: 0.85;
        font-weight: 500;
    }

    ::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }

    &[type='number'] {
        -moz-appearance: textfield;
    }

    &[type='range'] {
        padding: 0px;
    }
`;

export default Input;
