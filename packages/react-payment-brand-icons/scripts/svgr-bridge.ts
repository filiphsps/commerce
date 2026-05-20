import { transform } from '@svgr/core';

const SVG_INNER_REGEX = /<svg[^>]*>([\s\S]*)<\/svg>/;

export async function svgToInnerJsx(cleanedSvg: string): Promise<string> {
    if (!cleanedSvg.includes('<svg')) {
        throw new Error('SVGR input does not contain an <svg> element.');
    }

    // SVGO is intentionally disabled: the caller has already applied SVG transforms
    // (chrome removal, id-prefixing, dimension stripping) upstream. Running SVGO
    // here causes it to collapse multi-element trees (defs + path) into a
    // self-closing <svg/>, which breaks inner-JSX extraction.
    const componentString = await transform(
        cleanedSvg,
        {
            jsxRuntime: 'automatic',
            exportType: 'default',
            plugins: ['@svgr/plugin-jsx'],
            svgo: false,
            typescript: true,
        },
        { componentName: 'TmpIcon' },
    );

    const match = componentString.match(SVG_INNER_REGEX);
    if (!match || typeof match[1] !== 'string') {
        throw new Error('SVGR did not produce a <svg> element; input was not a valid SVG.');
    }
    return match[1].trim();
}
