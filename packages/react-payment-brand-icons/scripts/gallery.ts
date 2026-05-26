import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { deriveDefaults } from './derive';
import type { IconOverrides } from './types';

type GalleryEntry = {
    slug: string;
    componentName: string;
    title: string;
    aliases: readonly string[];
    filename: string;
    svgInline: string;
};

/**
 * Load `icons.ts` from the package root via dynamic import so overrides reflect
 * whatever the maintainer has curated. tsx executes this script, so the `.ts`
 * import resolves at runtime.
 *
 * @param packageRoot - absolute path to the package directory.
 * @returns the parsed override map.
 */
async function loadOverrides(packageRoot: string): Promise<IconOverrides> {
    const iconsUrl = pathToFileURL(join(packageRoot, 'icons.ts')).href;
    const mod = (await import(iconsUrl)) as { overrides: IconOverrides };
    return mod.overrides;
}

/**
 * Walk `svgs/` once and produce a merged record per icon containing the raw
 * SVG markup plus all data the gallery and docs page render — slug, title,
 * component name, aliases, filename.
 *
 * @param svgsDir - absolute path to the `svgs/` directory.
 * @param overrides - curated metadata loaded from `icons.ts`.
 * @returns one entry per `.svg` file, sorted by slug.
 */
async function collectEntries(svgsDir: string, overrides: IconOverrides): Promise<GalleryEntry[]> {
    const files = (await readdir(svgsDir)).filter((f) => extname(f).toLowerCase() === '.svg').sort();
    const entries: GalleryEntry[] = [];
    for (const filename of files) {
        const slug = filename.replace(/\.svg$/i, '');
        const defaults = deriveDefaults(slug);
        const o = overrides[slug] ?? {};
        const svgInline = await readFile(join(svgsDir, filename), 'utf8');
        entries.push({
            slug,
            componentName: o.componentName ?? defaults.componentName,
            title: o.title ?? defaults.title,
            aliases: o.aliases ?? [],
            filename,
            svgInline,
        });
    }
    return entries;
}

/**
 * HTML-escape a string for safe interpolation into element text or attribute
 * values. Handles the five characters that matter for the contexts this
 * script emits.
 *
 * @param s - the raw text to escape.
 * @returns the escaped text.
 */
function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Render the dev-server HTML page: sticky filter input on top, responsive
 * grid of icon cards below, all styles inline so the script is self-contained.
 *
 * @param entries - the icons to display.
 * @returns a complete HTML document.
 */
function renderHtml(entries: GalleryEntry[]): string {
    const cards = entries
        .map((e) => {
            const aliasLine = e.aliases.length
                ? `      <p class="aliases">aliases: ${e.aliases.map((a) => `<code>${escapeHtml(a)}</code>`).join(', ')}</p>`
                : '';
            return `    <article class="card" data-haystack="${escapeHtml([e.slug, e.title, ...e.aliases].join(' ').toLowerCase())}">
      <div class="icon">${e.svgInline}</div>
      <div class="meta">
        <h2>${escapeHtml(e.title)}</h2>
        <code class="slug">${escapeHtml(e.slug)}</code>
        <p class="filename">${escapeHtml(e.filename)} <span class="component">→ <code>${escapeHtml(e.componentName)}</code></span></p>
${aliasLine}
      </div>
    </article>`;
        })
        .join('\n');
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>react-payment-brand-icons (${entries.length})</title>
<style>
  * { box-sizing: border-box; }
  body { font: 14px/1.5 -apple-system, system-ui, sans-serif; margin: 0; padding: 0 24px 24px; background: #0d1117; color: #e6edf3; }
  header { position: sticky; top: 0; padding: 16px 0; background: #0d1117; border-bottom: 1px solid #30363d; z-index: 1; }
  header h1 { margin: 0 0 12px; font-size: 18px; font-weight: 600; }
  header h1 .count { color: #8b949e; font-weight: 400; margin-left: 6px; }
  input { width: 100%; padding: 10px 14px; background: #161b22; border: 1px solid #30363d; color: #e6edf3; border-radius: 6px; font-size: 14px; }
  input:focus { outline: none; border-color: #58a6ff; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; padding-top: 16px; }
  .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
  .icon { display: flex; align-items: center; justify-content: center; height: 84px; background: #fff; border-radius: 4px; }
  .icon svg { max-width: 84px; max-height: 56px; height: auto; width: auto; }
  .meta { display: flex; flex-direction: column; gap: 4px; }
  .meta h2 { margin: 0; font-size: 14px; font-weight: 600; color: #e6edf3; }
  .meta .slug { align-self: flex-start; font-size: 11px; color: #8b949e; background: #0d1117; padding: 2px 6px; border-radius: 3px; }
  .meta .filename { margin: 0; font-size: 11px; color: #8b949e; }
  .meta .filename .component { color: #6e7681; }
  .meta .filename code { color: #8b949e; font-size: 11px; }
  .meta .aliases { margin: 0; font-size: 11px; color: #8b949e; }
  .meta .aliases code { background: #0d1117; padding: 1px 5px; border-radius: 3px; }
  .card.hidden { display: none; }
  .empty { color: #8b949e; padding: 32px; text-align: center; display: none; }
  .empty.visible { display: block; }
</style>
</head>
<body>
<header>
  <h1>react-payment-brand-icons<span class="count">${entries.length} icons</span></h1>
  <input type="search" id="filter" placeholder="Filter by slug, title, or alias…" autofocus>
</header>
<main>
  <div class="grid" id="grid">
${cards}
  </div>
  <p class="empty" id="empty">No icons match that filter.</p>
</main>
<script>
  const filter = document.getElementById('filter');
  const cards = Array.from(document.querySelectorAll('.card'));
  const empty = document.getElementById('empty');
  filter.addEventListener('input', () => {
    const q = filter.value.trim().toLowerCase();
    let visible = 0;
    for (const card of cards) {
      const match = q === '' || card.dataset.haystack.includes(q);
      card.classList.toggle('hidden', !match);
      if (match) visible++;
    }
    empty.classList.toggle('visible', visible === 0);
  });
</script>
</body>
</html>`;
}

/**
 * Render the docs MDX page. Each entry produces a card that references the
 * source SVG via a relative path (`../svgs/<filename>`) instead of inlining
 * the markup, so the file stays small and the canonical SVG remains a single
 * source of truth. The output is plain MDX without any Nextra-specific
 * components so the file renders standalone if Nextra's MDX runtime ever
 * changes.
 *
 * @param entries - the icons to document.
 * @returns the MDX source.
 */
function renderMdx(entries: GalleryEntry[]): string {
    const cards = entries
        .map((e) => {
            const aliasParts = e.aliases.map((a) => `<code>${a}</code>`).join(', ');
            const aliasLine = e.aliases.length
                ? `    <div className="payment-icon-aliases">aliases: ${aliasParts}</div>`
                : '';
            const usage = `&lt;${e.componentName} /&gt;`;
            return `<div className="payment-icon-card">
  <div className="payment-icon-glyph"><img src="../svgs/${e.filename}" alt="${escapeHtml(e.title)}" width="38" height="24" /></div>
  <div className="payment-icon-meta">
    <strong>${e.title}</strong>
    <code>${e.slug}</code>
    <div className="payment-icon-filename">${e.filename} → <code>${usage}</code></div>
${aliasLine}
  </div>
</div>`;
        })
        .join('\n');
    return `---
title: Payment Brand Icons
---

{/* This file is generated by \`pnpm --filter react-payment-brand-icons docs:gen\`. Do not edit by hand. */}

# Payment Brand Icons

${entries.length} icons shipped by \`react-payment-brand-icons\`. Each card lists the icon's display title, slug, source filename, and the React component you import.

<div className="payment-icon-grid">
${cards}
</div>
`;
}

/**
 * Entry point. Default mode boots a tiny HTTP server that streams the
 * gallery HTML. Passing \`--docs <path>\` writes the MDX equivalent to the
 * given file instead and exits, so the same data feeds both the local dev
 * view and the static docs site.
 *
 * @throws when \`--docs\` is passed without a path argument.
 */
async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const packageRoot = resolve(fileURLToPath(import.meta.url), '..', '..');
    const svgsDir = join(packageRoot, 'svgs');

    const overrides = await loadOverrides(packageRoot);
    const entries = await collectEntries(svgsDir, overrides);

    const docsFlagIndex = args.indexOf('--docs');
    if (docsFlagIndex !== -1) {
        const target = args[docsFlagIndex + 1];
        if (!target) throw new Error('`--docs` requires a path argument.');
        const absolute = resolve(packageRoot, target);
        await mkdir(dirname(absolute), { recursive: true });
        await writeFile(absolute, renderMdx(entries), 'utf8');
        return;
    }

    const port = Number(process.env.PORT ?? 4173);
    const html = renderHtml(entries);
    const server = createServer((_req, res) => {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(html);
    });
    server.listen(port, () => {});
}

main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
});
