import { style } from '@vanilla-extract/css';

export const container = style({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '3rem',
    cursor: 'pointer',
    background: 'var(--accent-primary)',
    borderRadius: 'var(--block-border-radius)',
    color: 'var(--accent-primary-text)',
    fontSize: '1.5rem',

    '@media': {
        [`screen and (min-width: 950px)`]: {
            display: 'none'
        }
    }
});
