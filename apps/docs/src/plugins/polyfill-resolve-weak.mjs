// @ts-check
import { createRequire } from 'node:module';

// Resolve `webpack` from Docusaurus' own dependency graph instead of declaring
// it as a direct dep on this workspace. Docusaurus pins the webpack version it
// expects; piggy-backing avoids version skew.
const require = createRequire(import.meta.url);
const webpack = require('webpack');

/**
 * Docusaurus 3.10's SSR server bundle inlines `require.resolveWeak(...)` calls
 * for chunk preloading (via @docusaurus/react-loadable). webpack 5's runtime
 * only attaches `resolveWeak` to `__webpack_require__` when it detects usage
 * across the right combination of plugins; in some monorepo setups (notably
 * pnpm with `enable-global-virtual-store=false`) the detection misses and the
 * runtime is generated without it, so executing the server bundle throws
 * `TypeError: require.resolveWeak is not a function`.
 *
 * `resolveWeak` returns a module ID without forcing the chunk to load —
 * Docusaurus uses the result to emit preload hints. For static site generation
 * the eager `resolve` is semantically equivalent (the chunk is already in the
 * bundle), so we polyfill by aliasing one to the other at runtime via a
 * BannerPlugin that prepends a tiny shim to every server-target chunk.
 *
 * @returns {import('@docusaurus/types').Plugin<void>}
 */
export default function polyfillResolveWeakPlugin() {
    return {
        name: 'polyfill-resolve-weak',
        configureWebpack(_config, isServer) {
            if (!isServer) return {};

            return {
                plugins: [
                    new webpack.BannerPlugin({
                        banner:
                            'if (typeof __webpack_require__ !== "undefined" && ' +
                            'typeof __webpack_require__.resolveWeak !== "function" && ' +
                            'typeof __webpack_require__.resolve === "function") { ' +
                            '__webpack_require__.resolveWeak = __webpack_require__.resolve.bind(__webpack_require__); ' +
                            '} ' +
                            'if (typeof require !== "undefined" && ' +
                            'typeof require.resolveWeak !== "function" && ' +
                            'typeof require.resolve === "function") { ' +
                            'require.resolveWeak = require.resolve.bind(require); ' +
                            '}',
                        raw: true,
                        entryOnly: false,
                    }),
                ],
            };
        },
    };
}
