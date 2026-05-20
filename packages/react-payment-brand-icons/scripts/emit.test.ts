import { describe, expect, it } from 'vitest';

import {
    emitAliasesModule,
    emitIconComponent,
    emitIconsMapModule,
    emitIndexModule,
    emitManifestModule,
    emitNamesModule,
} from './emit';
import type { IconManifestEntry } from './types';

const visa: IconManifestEntry = { slug: 'visa', componentName: 'Visa', title: 'Visa', aliases: [] };
const amex: IconManifestEntry = {
    slug: 'american_express',
    componentName: 'AmericanExpress',
    title: 'American Express',
    aliases: ['amex'],
};

describe('emitIconComponent', () => {
    it('emits a tsx component wrapping inner JSX in IconShell', () => {
        const out = emitIconComponent({
            entry: visa,
            viewBox: '0 0 38 24',
            innerJsx: '<path d="M0 0" />',
        });
        expect(out).toContain("import { IconShell, type PaymentIconProps } from '../../shell';");
        expect(out).toContain('export default function Visa(props: PaymentIconProps)');
        expect(out).toContain('viewBox="0 0 38 24"');
        expect(out).toContain('title="Visa"');
        expect(out).toContain('<path d="M0 0" />');
    });
});

describe('emitIconsMapModule', () => {
    it('emits a record of slug -> dynamic import', () => {
        const out = emitIconsMapModule([visa, amex]);
        expect(out).toContain("'visa': () => import('./icons/visa.js')");
        expect(out).toContain("'american_express': () => import('./icons/american_express.js')");
        expect(out).toContain('export const ICONS');
    });
});

describe('emitAliasesModule', () => {
    it('emits an alias -> canonical record', () => {
        const out = emitAliasesModule([visa, amex]);
        expect(out).toContain("'amex': 'american_express'");
        expect(out).toContain('export const ALIASES');
    });

    it('emits an empty record when no aliases exist', () => {
        const out = emitAliasesModule([visa]);
        expect(out).toContain('export const ALIASES');
        expect(out).toContain('{}');
    });
});

describe('emitManifestModule', () => {
    it('emits an array of manifest entries with frozen literals', () => {
        const out = emitManifestModule([visa, amex]);
        expect(out).toContain("slug: 'visa'");
        expect(out).toContain("componentName: 'Visa'");
        expect(out).toContain("aliases: ['amex']");
        expect(out).toContain('export const manifest');
    });
});

describe('emitNamesModule', () => {
    it('emits string-literal union types', () => {
        const out = emitNamesModule([visa, amex]);
        expect(out).toMatch(/export type PaymentIconName\s*=\s*'visa'\s*\|\s*'american_express'/);
        expect(out).toMatch(/export type PaymentIconAlias\s*=\s*'amex'/);
        expect(out).toContain('export type PaymentIconNameOrAlias');
    });

    it('uses `never` for empty alias union', () => {
        const out = emitNamesModule([visa]);
        expect(out).toMatch(/export type PaymentIconAlias\s*=\s*never/);
    });
});

describe('emitIndexModule', () => {
    it('re-exports every component', () => {
        const out = emitIndexModule([visa, amex]);
        expect(out).toContain("export { default as Visa } from './icons/visa';");
        expect(out).toContain("export { default as AmericanExpress } from './icons/american_express';");
    });
});
