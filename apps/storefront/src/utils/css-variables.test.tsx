import { describe, expect, it, vi } from 'vitest';

import { CssVariablesProvider } from '@/utils/css-variables';
import { render, waitFor } from '@/utils/test/react';

vi.mock('@shopify/hydrogen-react', async () => {
    return {
        useShop: vi.fn().mockReturnValue({}),
        useShopifyCookies: vi.fn().mockReturnValue({}),
    };
});

describe('utils', () => {
    describe('CssVariablesProvider', () => {
        it('should render without crashing', async () => {
            const wrapper = render(await CssVariablesProvider({ domain: 'example.com' }));

            expect(() => wrapper.unmount()).not.toThrow();
        });

        it('should render with the correct styles', async () => {
            const { container, unmount } = render(await CssVariablesProvider({ domain: 'example.com' }));

            await waitFor(() => {
                expect(container.innerHTML).toContain('--color-accent-primary: #00ff00;');
                expect(container.innerHTML).toContain('--color-accent-primary-text: #000000;');
                expect(container.innerHTML).toContain('--color-accent-secondary: #0000ff;');
                expect(container.innerHTML).toContain('--color-accent-secondary-text: #ffffff;');
                expect(unmount).not.toThrow();
            });
        });

        it('should render with the correct styles when shop is provided', async () => {
            const { container, unmount } = render(
                await CssVariablesProvider({
                    domain: 'example.com',
                    shop: {
                        design: {
                            accents: [
                                {
                                    type: 'primary',
                                    color: '#00ff00',
                                    foreground: '#000000',
                                },
                                {
                                    type: 'secondary',
                                    color: '#0000ff',
                                    foreground: '#ffffff',
                                },
                            ],
                        },
                    } as any,
                }),
            );

            await waitFor(() => {
                expect(container.innerHTML).toContain('--color-accent-primary: #00ff00;');
                expect(container.innerHTML).toContain('--color-accent-primary-text: #000000;');
                expect(container.innerHTML).toContain('--color-accent-secondary: #0000ff;');
                expect(container.innerHTML).toContain('--color-accent-secondary-text: #ffffff;');
                expect(unmount).not.toThrow();
            });
        });

        it('should omit background/foreground and product-card knobs for a theme-less shop', async () => {
            const { container, unmount } = render(
                await CssVariablesProvider({
                    domain: 'example.com',
                    shop: {
                        design: {
                            accents: [
                                { type: 'primary', color: '#00ff00', foreground: '#000000' },
                                { type: 'secondary', color: '#0000ff', foreground: '#ffffff' },
                            ],
                        },
                    } as any,
                }),
            );

            await waitFor(() => {
                // A branded theme-less shop is byte-identical to master, which emitted these chrome
                // literals inside the branding `<style>` (they have no globals.css base). Every other
                // group has a base and falls through (diff-from-default emits nothing).
                expect(container.innerHTML).toContain('--color-background: #fefefe;');
                expect(container.innerHTML).toContain('--color-foreground: #101418;');
                expect(container.innerHTML).not.toContain('--product-card-');
                expect(container.innerHTML).not.toContain('--aspect-product-card-');
                // Surface / text / border / state / focus / geometry / typography / elevation groups.
                expect(container.innerHTML).not.toContain('--color-block');
                expect(container.innerHTML).not.toContain('--color-dark');
                expect(container.innerHTML).not.toContain('--border-default');
                expect(container.innerHTML).not.toContain('--border-strong');
                expect(container.innerHTML).not.toContain('--color-sale');
                expect(container.innerHTML).not.toContain('--color-danger');
                expect(container.innerHTML).not.toContain('--focus-ring');
                expect(container.innerHTML).not.toContain('--block-border-radius');
                expect(container.innerHTML).not.toContain('--block-padding');
                expect(container.innerHTML).not.toContain('--block-spacer');
                expect(container.innerHTML).not.toContain('--text-sm');
                expect(container.innerHTML).not.toContain('--font-weight');
                expect(container.innerHTML).not.toContain('--header-panel-shadow');
                // Brand accents still emit as before.
                expect(container.innerHTML).toContain('--color-accent-primary: #00ff00;');
                expect(unmount).not.toThrow();
            });
        });

        it('renders nothing for a theme-less, no-branding shop (byte-identical master fallback)', async () => {
            // No accents and no theme → getBrandingColors resolves null and every group is default,
            // so the provider emits no <style>. The body then falls back to --color-bright/--color-dark
            // (#ffffff/#222222) exactly as master did for an unbranded shop — NOT the #fefefe/#101418
            // chrome, which master only emitted inside the branding block.
            const result = await CssVariablesProvider({
                domain: 'example.com',
                shop: { design: { accents: [] } } as any,
            });

            expect(result).toBeNull();
        });

        it('should emit theme overrides for background, foreground, accent shades and product-card knobs', async () => {
            const { container, unmount } = render(
                await CssVariablesProvider({
                    domain: 'example.com',
                    shop: {
                        design: {
                            accents: [
                                { type: 'primary', color: '#00ff00', foreground: '#000000' },
                                { type: 'secondary', color: '#0000ff', foreground: '#ffffff' },
                            ],
                        },
                        theme: {
                            colors: {
                                background: '#0b0b0b',
                                foreground: '#fafafa',
                                accentPrimaryLight: '#abcdef',
                            },
                            productCard: {
                                ctaBg: '#123456',
                                aspectVertical: '3 / 4',
                                saleBadgeText: 'SALE',
                                saleBadgeAllowOverlap: true,
                            },
                        },
                    } as any,
                }),
            );

            await waitFor(() => {
                expect(container.innerHTML).toContain('--color-background: #0b0b0b;');
                expect(container.innerHTML).toContain('--color-foreground: #fafafa;');
                // Theme-pinned accent shade supersedes the runtime colord derivation.
                expect(container.innerHTML).toContain('--color-accent-primary-light: #abcdef;');
                // Plain, aspect-namespaced, quoted and boolean knobs each serialize correctly.
                expect(container.innerHTML).toContain('--product-card-cta-bg: #123456;');
                expect(container.innerHTML).toContain('--aspect-product-card-vertical: 3 / 4;');
                expect(container.innerHTML).toContain('--product-card-sale-badge-text: "SALE";');
                expect(container.innerHTML).toContain('--product-card-sale-badge-allow-overlap: true;');
                expect(unmount).not.toThrow();
            });
        });

        it('emits each themed surface/text/border/state/focus/geometry/typography/elevation group onto its consumed var', async () => {
            const { container, unmount } = render(
                await CssVariablesProvider({
                    domain: 'example.com',
                    shop: {
                        design: { accents: [] },
                        theme: {
                            colors: {
                                surface: { base: '#111111', raised: '#222222', sunken: '#333333' },
                                text: { default: '#444444', muted: '#555556' },
                                border: { default: '#666666', strong: '#777777' },
                                state: { sale: '#880000', danger: '#990000', success: '#00aa00', info: '#0000bb' },
                                focusRing: '#abcabc',
                            },
                            radii: { block: '20px', blockLarge: '24px', blockSmall: '16px', blockTiny: '4px' },
                            spacing: { blockPadding: '1rem', blockSpacer: '0.9rem' },
                            elevation: { card: '0 0 1px black', cardHover: '0 0 2px black', panel: '0 0 3px black' },
                            typography: { scale: { sm: '0.9rem' }, fontWeights: { bold: 800 } },
                        },
                    } as any,
                }),
            );

            await waitFor(() => {
                expect(container.innerHTML).toContain('--color-block: #111111;');
                expect(container.innerHTML).toContain('--color-block-light: #222222;');
                expect(container.innerHTML).toContain('--color-block-dark: #333333;');
                expect(container.innerHTML).toContain('--color-dark: #444444;');
                expect(container.innerHTML).toContain('--color-dark-secondary: #555556;');
                expect(container.innerHTML).toContain('--border-default: #666666;');
                expect(container.innerHTML).toContain('--border-strong: #777777;');
                expect(container.innerHTML).toContain('--color-sale: #880000;');
                expect(container.innerHTML).toContain('--color-danger: #990000;');
                expect(container.innerHTML).toContain('--color-block-success: #00aa00;');
                expect(container.innerHTML).toContain('--color-block-info: #0000bb;');
                expect(container.innerHTML).toContain('--focus-ring: #abcabc;');
                expect(container.innerHTML).toContain('--block-border-radius: 20px;');
                expect(container.innerHTML).toContain('--block-border-radius-large: 24px;');
                expect(container.innerHTML).toContain('--block-border-radius-small: 16px;');
                expect(container.innerHTML).toContain('--block-border-radius-tiny: 4px;');
                expect(container.innerHTML).toContain('--block-padding: 1rem;');
                expect(container.innerHTML).toContain('--block-spacer: 0.9rem;');
                expect(container.innerHTML).toContain('--product-card-shadow: 0 0 1px black;');
                expect(container.innerHTML).toContain('--product-card-shadow-hover: 0 0 2px black;');
                expect(container.innerHTML).toContain('--header-panel-shadow: 0 0 3px black;');
                // Only the overridden type-scale / weight steps emit; untouched steps stay on the base.
                expect(container.innerHTML).toContain('--text-sm: 0.9rem;');
                expect(container.innerHTML).not.toContain('--text-base:');
                expect(container.innerHTML).toContain('--font-weight-bold: 800;');
                expect(container.innerHTML).not.toContain('--font-weight-normal:');
                expect(unmount).not.toThrow();
            });
        });

        // Phase-0 snapshot guard: locks the exact `<style>` text the provider emits today so the
        // serializer extraction (Phase 2) can be proven byte-identical. If this snapshot diffs after
        // the extraction, the serializer is wrong — fix the serializer, never update the snapshot.
        it('emits a byte-stable <style> for a branded, theme-less shop (defaults snapshot)', async () => {
            const { container, unmount } = render(
                await CssVariablesProvider({
                    domain: 'example.com',
                    shop: {
                        design: {
                            accents: [
                                { type: 'primary', color: '#00ff00', foreground: '#000000' },
                                { type: 'secondary', color: '#0000ff', foreground: '#ffffff' },
                            ],
                        },
                    } as any,
                }),
            );

            await waitFor(() => {
                expect(container.querySelector('style')?.textContent).toMatchSnapshot();
                expect(unmount).not.toThrow();
            });
        });

        it('emits a byte-stable <style> across structured groups, productCard knobs, quoted knobs, accents and font override', async () => {
            const { container, unmount } = render(
                await CssVariablesProvider({
                    domain: 'example.com',
                    shop: {
                        design: {
                            accents: [
                                { type: 'primary', color: '#00ff00', foreground: '#000000' },
                                { type: 'secondary', color: '#0000ff', foreground: '#ffffff' },
                            ],
                        },
                        theme: {
                            colors: {
                                background: '#0b0b0b',
                                foreground: '#fafafa',
                                surface: { base: '#111111', raised: '#222222', sunken: '#333333' },
                                text: { default: '#444444', muted: '#555556' },
                                border: { default: '#666666', strong: '#777777' },
                                state: { sale: '#880000', danger: '#990000', success: '#00aa00', info: '#0000bb' },
                                focusRing: '#abcabc',
                                // Pin one derived shade; leave the rest to runtime colord derivation.
                                accentPrimaryLight: '#abcdef',
                            },
                            radii: { block: '20px', blockLarge: '24px', blockSmall: '16px', blockTiny: '4px' },
                            spacing: { blockPadding: '1rem', blockSpacer: '0.9rem' },
                            elevation: { card: '0 0 1px black', cardHover: '0 0 2px black', panel: '0 0 3px black' },
                            typography: {
                                // headingFamily differs from the body family (differ case).
                                headingFamily: 'lora',
                                scale: { sm: '0.9rem' },
                                fontWeights: { bold: 800 },
                            },
                            productCard: {
                                ctaBg: '#123456',
                                aspectVertical: '3 / 4',
                                imageSizes: '(max-width: 600px) 100vw, 300px',
                                ctaPillLabel: 'Add',
                                ctaPillIcon: '★',
                                saleBadgeText: 'SALE',
                                saleBadgeAllowOverlap: true,
                                titleLineClamp: 3,
                                oosOpacity: 0.5,
                            },
                        },
                    } as any,
                }),
            );

            await waitFor(() => {
                expect(container.querySelector('style')?.textContent).toMatchSnapshot();
                expect(unmount).not.toThrow();
            });
        });

        it('lets theme.colors.accents override design.accents when feeding the branding accents', async () => {
            const { container, unmount } = render(
                await CssVariablesProvider({
                    domain: 'example.com',
                    shop: {
                        design: {
                            accents: [
                                { type: 'primary', color: '#00ff00', foreground: '#000000' },
                                { type: 'secondary', color: '#0000ff', foreground: '#ffffff' },
                            ],
                        },
                        theme: {
                            colors: {
                                accents: [
                                    { type: 'primary', color: '#ff0000', foreground: '#ffffff' },
                                    { type: 'secondary', color: '#00ff99', foreground: '#000000' },
                                ],
                            },
                        },
                    } as any,
                }),
            );

            await waitFor(() => {
                // The theme override wins over design.accents.
                expect(container.innerHTML).toContain('--color-accent-primary: #ff0000;');
                expect(container.innerHTML).toContain('--color-accent-secondary: #00ff99;');
                expect(container.innerHTML).not.toContain('--color-accent-primary: #00ff00;');
                expect(container.innerHTML).not.toContain('--color-accent-secondary: #0000ff;');
                expect(unmount).not.toThrow();
            });
        });
    });
});
