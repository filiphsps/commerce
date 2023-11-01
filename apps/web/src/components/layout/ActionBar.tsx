import styled from 'styled-components';

export const ActionBar = styled.div`
    display: flex;
    justify-content: end;
    align-items: center;
    gap: var(--block-spacer);
    height: 3rem;
    padding: 0 var(--block-padding);
    border-radius: var(--block-padding-large);
    background: var(--accent-secondary);
    color: var(--accent-secondary-text);
    user-select: none;
`;
export const ActionBarItem = styled.div<{ active?: boolean }>`
    font-size: 1.5rem;
    line-height: 3rem;
    font-weight: 700;
    text-align: center;
    text-transform: uppercase;
    color: var(--color-dark);
    opacity: ${({ active }) => (active && '1') || '0.75'};
    cursor: pointer;
`;
