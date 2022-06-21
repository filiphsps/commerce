import styled from 'styled-components';

const Input = styled.input`
    max-width: 100%;
    border: 0.2rem solid #efefef;
    border-radius: var(--block-border-radius);
    outline: none;

    ::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }

    &[type='number'] {
        -moz-appearance: textfield;
    }
`;

export default Input;
