/**
 * Adds Tailwind v4 to Docusaurus' PostCSS pipeline.
 *
 * Tailwind's PostCSS plugin scans every CSS file in the build for `@import
 * "tailwindcss"` directives and generates the utility classes referenced from
 * the JSX/TSX source. See `src/css/custom.css` for the entry point.
 */
module.exports = function tailwindPlugin() {
    return {
        name: 'docusaurus-tailwind',
        configurePostCss(postcssOptions) {
            postcssOptions.plugins.push(require('@tailwindcss/postcss'));
            return postcssOptions;
        },
    };
};
