import styled from 'styled-components';

export const BadgeContainer = styled.div`
    overflow: hidden;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    display: flex;
    gap: var(--block-spacer);
    flex-wrap: wrap;
    justify-content: stretch;
    align-items: stretch;
    max-width: 100%;
`;
export const Badge = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    text-transform: uppercase;
    font-size: 1.25rem;
    line-height: 1.5rem;
    font-weight: 600;
    background: var(--color-block);
    color: var(--color-dark);
    padding: calc(var(--block-padding-large) / 2) var(--block-padding-large);
    border-radius: var(--block-padding-large);
`;
