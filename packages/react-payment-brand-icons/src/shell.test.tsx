import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { IconShell } from './shell';

describe('IconShell', () => {
    it('renders an <svg> with the supplied viewBox and inner children', () => {
        const { container } = render(
            <IconShell viewBox="0 0 38 24" title="Visa">
                <path d="M0 0h1v1H0z" />
            </IconShell>,
        );
        const svg = container.querySelector('svg')!;
        expect(svg).toBeTruthy();
        expect(svg.getAttribute('viewBox')).toBe('0 0 38 24');
        expect(svg.querySelector('path')).toBeTruthy();
    });

    it('sets width and height to default 38x24 when no size props are passed', () => {
        const { container } = render(
            <IconShell viewBox="0 0 38 24" title="Visa">
                <path d="M0 0" />
            </IconShell>,
        );
        const svg = container.querySelector('svg')!;
        expect(svg.getAttribute('width')).toBe('38');
        expect(svg.getAttribute('height')).toBe('24');
    });

    it('size shorthand sets both width and height', () => {
        const { container } = render(
            <IconShell viewBox="0 0 38 24" title="Visa" size={64}>
                <path d="M0 0" />
            </IconShell>,
        );
        const svg = container.querySelector('svg')!;
        expect(svg.getAttribute('width')).toBe('64');
        expect(svg.getAttribute('height')).toBe('64');
    });

    it('explicit width and height override size', () => {
        const { container } = render(
            <IconShell viewBox="0 0 38 24" title="Visa" size={64} width={80} height={50}>
                <path d="M0 0" />
            </IconShell>,
        );
        const svg = container.querySelector('svg')!;
        expect(svg.getAttribute('width')).toBe('80');
        expect(svg.getAttribute('height')).toBe('50');
    });

    it('renders the chrome rect by default (chrome="card")', () => {
        const { container } = render(
            <IconShell viewBox="0 0 38 24" title="Visa">
                <path d="M0 0" />
            </IconShell>,
        );
        const chromePaths = container.querySelectorAll('svg > path[data-rpbi-chrome]');
        expect(chromePaths.length).toBe(2);
    });

    it('omits the chrome rect when chrome="none"', () => {
        const { container } = render(
            <IconShell viewBox="0 0 38 24" title="Visa" chrome="none">
                <path d="M0 0" />
            </IconShell>,
        );
        const chromePaths = container.querySelectorAll('svg > path[data-rpbi-chrome]');
        expect(chromePaths.length).toBe(0);
    });

    it('embeds <title> and sets aria-label when title is a string', () => {
        const { container } = render(
            <IconShell viewBox="0 0 38 24" title="Visa">
                <path d="M0 0" />
            </IconShell>,
        );
        const svg = container.querySelector('svg')!;
        expect(svg.getAttribute('aria-label')).toBe('Visa');
        expect(svg.getAttribute('role')).toBe('img');
        expect(svg.querySelector('title')?.textContent).toBe('Visa');
    });

    it('sets aria-hidden and omits <title> when title is null', () => {
        const { container } = render(
            <IconShell viewBox="0 0 38 24" title={null}>
                <path d="M0 0" />
            </IconShell>,
        );
        const svg = container.querySelector('svg')!;
        expect(svg.getAttribute('aria-hidden')).toBe('true');
        expect(svg.getAttribute('aria-label')).toBeNull();
        expect(svg.querySelector('title')).toBeNull();
    });

    it('forwards className, style, and arbitrary SVG attributes', () => {
        const { container } = render(
            <IconShell viewBox="0 0 38 24" title="Visa" className="x" style={{ opacity: 0.5 }} data-testid="t">
                <path d="M0 0" />
            </IconShell>,
        );
        const svg = container.querySelector('svg')!;
        expect(svg.getAttribute('class')).toBe('x');
        expect(svg.getAttribute('data-testid')).toBe('t');
        expect(svg.style.opacity).toBe('0.5');
    });
});
