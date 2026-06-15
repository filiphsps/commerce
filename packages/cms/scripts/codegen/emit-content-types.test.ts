import { describe, expect, it } from 'vitest';
import { generateContentTypes } from './emit-content-types';

describe('generateContentTypes — responsive fields', () => {
    const output = generateContentTypes();

    /** Extract the body of a generated `export interface <name> { … }` block. */
    const interfaceBody = (name: string): string => {
        const match = output.match(new RegExp(`export interface ${name} \\{([\\s\\S]*?)\\n\\}`));
        if (!match) throw new Error(`interface ${name} not found in generated output`);
        return match[1]!;
    };

    it('emits the collection layout as a per-breakpoint map keyed by the shared scale', () => {
        const body = interfaceBody('CollectionBlock');
        expect(body).toContain('layout?: {');
        // `base` is required; the rest are optional + nullable, in scale order.
        expect(body).toContain("base: ('grid' | 'carousel')");
        expect(body).toContain("sm?: ('grid' | 'carousel') | null");
        expect(body).toContain("md?: ('grid' | 'carousel') | null");
        expect(body).toContain("lg?: ('grid' | 'carousel') | null");
        expect(body).toContain("xl?: ('grid' | 'carousel') | null");
        expect(body).toContain("'2xl'?: ('grid' | 'carousel') | null");
    });
});
