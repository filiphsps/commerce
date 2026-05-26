import { optimize } from 'svgo';

/**
 * Minify a cleaned SVG string before it is handed to SVGR.
 *
 * Source SVGs in `svgs/` stay untouched; this only shrinks the in-memory
 * string that becomes inline JSX in the generated `*.tsx` icon component.
 *
 * `cleanupIds` is disabled because the upstream `prefixIds` transform has
 * already namespaced IDs to a stable per-slug prefix and we do not want
 * SVGO to rename or drop them. `viewBox` is preserved by `preset-default`
 * once width/height are stripped upstream, so no override is needed there.
 *
 * @param svgString - cleaned, transform-applied SVG markup.
 * @returns minified SVG markup.
 */
export function minifySvg(svgString: string): string {
    const { data } = optimize(svgString, {
        multipass: true,
        plugins: [
            {
                name: 'preset-default',
                params: {
                    overrides: {
                        cleanupIds: false,
                    },
                },
            },
        ],
        js2svg: { pretty: false },
    });
    return data;
}
