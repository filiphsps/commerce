import { style } from '@vanilla-extract/css';

export const header = style({
    display: 'grid',
    width: '100%',
    background: 'var(--accent-secondary-light)',
    borderBottom: 'calc(var(--block-border-width) / 2) solid var(--accent-secondary)'
});

export const content = style({
    display: 'grid',
    gridTemplateColumns: 'auto auto 1fr',
    gap: '0.5rem',
    maxWidth: 'var(--page-width)',
    width: '100%',
    height: '100%',
    padding: '0.5rem',
    margin: '0 auto',
    userSelect: 'none',

    '@media': {
        [`screen and (min-width: 950px)`]: {
            gridTemplateColumns: '10rem 1fr auto',
            gap: 'var(--block-spacer-large)'
        }
    }
});

export const logo = style({
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '2.75rem',
    padding: '0.35rem 0.5rem',
    background: 'var(--accent-primary)',
    borderRadius: 'var(--block-border-radius)'
});

export const logoImage = style({
    height: '100%',
    width: '100%',
    objectFit: 'contain'
});
