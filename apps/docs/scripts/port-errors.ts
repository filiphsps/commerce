#!/usr/bin/env tsx
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { collectThrowSites, type ThrowSite } from './lib/throw-site-collector';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_APP = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(DOCS_APP, '../..');
const ERRORS_SRC = path.join(REPO_ROOT, 'apps/landing/docs/errors');
const ERRORS_OUT = path.join(DOCS_APP, 'content/errors');
const ERRORS_PKG_SRC = path.join(REPO_ROOT, 'packages/errors/src/index.ts');

/**
 * Convert each Markdoc {% card %}-wrapped error page from apps/landing/docs/errors/
 * into plain MDX with H2 sections. Strips Markdoc-specific tags; preserves headings
 * and code blocks. Output filename is lowercase-kebab(code), so /docs/errors/api-unknown-locale/
 * resolves to API_UNKNOWN_LOCALE.
 *
 * @param options.quiet - When true, suppresses console output.
 * @returns Count of converted pages.
 */
export function main({ quiet = false }: { quiet?: boolean } = {}): { converted: number } {
    if (!fs.existsSync(ERRORS_SRC)) {
        if (!quiet) console.warn('[port-errors] source directory missing — skipping');
        return { converted: 0 };
    }
    fs.mkdirSync(ERRORS_OUT, { recursive: true });
    let converted = 0;
    const codes: string[] = [];
    // Only touch files whose content actually changed so the dev MDX watcher
    // doesn't fire on no-op runs.
    const touched = new Set<string>();
    // _overrides.json is checked into the repo — preserve it through prune.
    touched.add(path.join(ERRORS_OUT, '_overrides.json'));

    for (const entry of fs.readdirSync(ERRORS_SRC)) {
        if (!entry.endsWith('.mdx')) continue;
        const code = entry.replace(/\.mdx$/, '');
        const src = fs.readFileSync(path.join(ERRORS_SRC, entry), 'utf8');
        const mdx = convertOne(code, src);
        const dest = path.join(ERRORS_OUT, `${kebab(code)}.mdx`);
        writeIfChanged(dest, mdx, touched);
        codes.push(code);
        converted++;
    }

    emitErrorsMeta(codes, touched);

    const pruned = pruneUntouched(ERRORS_OUT, touched);
    if (!quiet) console.info(`[port-errors] converted ${converted} pages, ${pruned} pruned`);
    return { converted };
}

/**
 * Write `content` to `file` only when it differs from the existing file on
 * disk. Always records the path in `touched` so the prune step keeps it.
 *
 * @param file - Absolute destination path.
 * @param content - Bytes to write.
 * @param touched - Set of paths considered live this run.
 */
function writeIfChanged(file: string, content: string, touched: Set<string>): void {
    touched.add(file);
    if (fs.existsSync(file)) {
        const existing = fs.readFileSync(file, 'utf8');
        if (existing === content) return;
    }
    fs.writeFileSync(file, content);
}

/**
 * Remove files under `root` not touched this run. Lets the next gen pass
 * cleanly drop error codes that have been renamed or deleted upstream.
 *
 * @param root - Output directory to scan.
 * @param touched - Files written or preserved during this run.
 * @returns Count of files deleted.
 */
function pruneUntouched(root: string, touched: Set<string>): number {
    let pruned = 0;
    function visit(dir: string): void {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) visit(full);
            else if (entry.isFile() && !touched.has(full)) {
                fs.unlinkSync(full);
                pruned++;
            }
        }
    }
    if (fs.existsSync(root)) visit(root);
    return pruned;
}

/**
 * Convert a single Markdoc error page to MDX with the Nordstar chrome:
 * frontmatter, `<ErrorHero>` with code + description + class + kind badges,
 * `<Causes>` list, "How it's thrown" code block from the original, and a
 * `<ThrownFromList>` populated by scanning the monorepo for matching throw
 * sites. Closes with `<StableHelpUrl>` and an edit-on-github link.
 *
 * @param code - SCREAMING_SNAKE_CASE error code (e.g. API_UNKNOWN_LOCALE).
 * @param src - Raw Markdoc source string.
 * @returns MDX file body including frontmatter.
 */
function convertOne(code: string, src: string): string {
    const sections = parseSections(src);
    const description = sections.documentation || `Error ${code}.`;
    const lookup = resolveClassFromCode(code);

    const frontmatter = [
        '---',
        `title: ${code}`,
        `description: ${escapeYaml(description)}`,
        '---',
        '',
    ].join('\n');

    const heroProps: string[] = [`code="${code}"`, `description=${jsxAttr(description)}`];
    if (lookup) {
        heroProps.push(`errorClass="${lookup.className}"`);
        heroProps.push(`kind="${lookup.kind}"`);
        heroProps.push(`classHref="/reference/errors/${kebabClass(lookup.className)}/"`);
    }
    const hero = `<ErrorHero ${heroProps.join(' ')} />`;

    // MDX requires a blank line between a JSX tag and inline markdown so the
    // bullets inside <Causes> are still parsed as a list.
    const causesBlock = sections.causes
        ? ['## Possible causes', '', '<Causes>', '', sections.causes, '', '</Causes>'].join('\n')
        : '';

    const codeBlock = sections.code ? ["## How it's thrown", '', sections.code].join('\n') : '';

    const sites = lookup ? loadThrowSites().filter((s) => s.errorClass === lookup.className) : [];
    const thrownFrom = sites.length
        ? [
              '## Thrown from',
              '',
              '<ThrownFromList>',
              ...sites.map((s) => {
                  const href = `https://github.com/filiphsps/commerce/blob/master/${s.file}#L${s.line}`;
                  return `  <ThrownFromCard path=${jsxAttr(s.file)} line={${s.line}} context=${jsxAttr(s.context)} href="${href}" />`;
              }),
              '</ThrownFromList>',
          ].join('\n')
        : '';

    const slug = kebab(code);
    const helpUrl = `https://docs.nordcom.io/errors/${slug}/`;
    const editUrl = `https://github.com/filiphsps/commerce/edit/master/apps/landing/docs/errors/${code}.mdx`;
    const footer = `<StableHelpUrl href="${helpUrl}" editUrl="${editUrl}" />`;

    return [frontmatter, hero, '', causesBlock, '', codeBlock, '', thrownFrom, '', footer, ''].join('\n');
}

type ErrorSections = {
    causes: string;
    documentation: string;
    code: string;
};

/**
 * Split a Markdoc error page into the three canonical sections (Causes,
 * Documentation, Code). Strips card wrappers and the `####` heading prefix.
 *
 * @param src - Raw Markdoc source.
 * @returns The three section bodies, each trimmed (empty string when absent).
 */
function parseSections(src: string): ErrorSections {
    const stripped = src.replace(/^\s*{%\s*\/?card[^%]*%}\s*$/gm, '').trim();
    const out: ErrorSections = { causes: '', documentation: '', code: '' };
    // Match `#### <Label>` followed by content up to the next `#### ` or EOF.
    for (const m of stripped.matchAll(/####\s+(\w+(?:\s+\w+)*)\s*\n+([\s\S]*?)(?=\n####\s+|$)/g)) {
        const label = (m[1] as string).toLowerCase();
        const body = (m[2] as string).trim();
        if (label.startsWith('possible cause')) out.causes = body;
        else if (label.startsWith('documentation')) out.documentation = body.split('\n')[0]?.trim() ?? '';
        else if (label.startsWith('code')) out.code = body;
    }
    return out;
}

/**
 * Render a string value as a JSX attribute. Uses single quotes when the value
 * contains a double quote, otherwise wraps in double quotes. Escapes braces
 * so MDX does not interpret them as JSX expressions.
 *
 * @param value - The raw attribute value.
 * @returns A JSX-attribute literal including the surrounding quotes.
 */
function jsxAttr(value: string): string {
    const escaped = value.replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');
    if (escaped.includes('"')) return `'${escaped.replace(/'/g, "\\'")}'`;
    return `"${escaped}"`;
}

/**
 * Convert a PascalCase class name to its kebab-case URL slug.
 * Mirrors the kebab logic used by `emit-reference-mdx`.
 *
 * @param name - PascalCase class name (e.g. `UnknownLocaleError`).
 * @returns Kebab-case slug (`unknown-locale-error`).
 */
function kebabClass(name: string): string {
    return name.replace(/[A-Z]/g, (m, i) => (i === 0 ? m.toLowerCase() : `-${m.toLowerCase()}`));
}

/**
 * Emit a Fumadocs meta.json for the errors tab, grouping codes by their
 * SCREAMING_SNAKE prefix with a hand-curated override map read from
 * `content/errors/_overrides.json`. Codes listed in the override map are
 * placed in the named group instead of their natural prefix group.
 *
 * Uses the Fumadocs `--<label>` separator syntax inside the `pages` array to
 * render group headers in the sidebar. If separators don't render in the
 * installed Fumadocs version, migrate to per-category subfolders and update
 * this function accordingly.
 *
 * @param codes - All converted SCREAMING_SNAKE_CASE error codes.
 */
function emitErrorsMeta(codes: string[], touched: Set<string>): void {
    const overridesPath = path.join(ERRORS_OUT, '_overrides.json');
    const overrides = fs.existsSync(overridesPath)
        ? (JSON.parse(fs.readFileSync(overridesPath, 'utf8')) as Record<string, string[]>)
        : {};
    const overrideSet = new Set(Object.values(overrides).flat());

    const groups: Record<string, string[]> = { general: overrides.general ?? [] };

    for (const code of codes) {
        if (overrideSet.has(code)) continue;
        const prefix = code.split('_')[0] as string;
        groups[prefix] ??= [];
        groups[prefix].push(code);
    }

    const pages: string[] = [];
    for (const [prefix, list] of Object.entries(groups).sort()) {
        if (list.length === 0) continue;
        const groupSlug = `--${prefix.toLowerCase()}`;
        pages.push(groupSlug, ...list.map((c) => c.toLowerCase().replace(/_/g, '-')));
    }

    writeIfChanged(
        path.join(ERRORS_OUT, 'meta.json'),
        JSON.stringify(
            {
                title: 'Errors',
                description: 'Stable error-code catalogue.',
                root: true,
                pages,
            },
            null,
            4,
        ),
        touched,
    );
}

/** Lazily populated cache from `collectThrowSites`. */
let throwSitesCache: ThrowSite[] | null = null;

/**
 * Return (and cache) the flat list of throw sites collected from packages and
 * apps source trees. Calls `collectThrowSites` at most once per process run.
 *
 * @returns Cached flat list of throw sites.
 */
function loadThrowSites(): ThrowSite[] {
    if (throwSitesCache === null) {
        throwSitesCache = collectThrowSites(REPO_ROOT);
    }
    return throwSitesCache;
}

type SymbolLookup = { className: string; kind: string };

/** Lazily populated cache from parsing the errors package switch. */
let codeToSymbolCache: Map<string, SymbolLookup> | null = null;

/**
 * Parse `packages/errors/src/index.ts`'s `getErrorFromCode` switch statement
 * to build a map from SCREAMING_SNAKE error code (enum member name) to its
 * class name and the kind enum it belongs to.
 *
 * @throws {Error} When the errors package source file is not found; the
 *   throw-site feature depends on this mapping.
 * @returns Map from code string to `{ className, kind }`.
 */
function buildCodeToSymbolMap(): Map<string, SymbolLookup> {
    if (!fs.existsSync(ERRORS_PKG_SRC)) {
        throw new Error(
            `[port-errors] Cannot find ${ERRORS_PKG_SRC}. The throw-site feature requires the errors package source.`,
        );
    }
    const src = fs.readFileSync(ERRORS_PKG_SRC, 'utf8');
    const map = new Map<string, SymbolLookup>();
    for (const m of src.matchAll(/case (\w+ErrorKind)\.(\w+):[\s\S]*?return (\w+)/g)) {
        const kind = m[1] as string;
        const memberName = m[2] as string;
        const className = (m[3] as string).split(/\s/)[0] as string;
        map.set(memberName, { className, kind });
    }
    return map;
}

/**
 * Resolve the symbol lookup for a given SCREAMING_SNAKE_CASE code string.
 *
 * @param code - SCREAMING_SNAKE_CASE error code (file-based, matches enum member name).
 * @returns Resolved `{ className, kind }`, or undefined when the code is unknown.
 */
function resolveClassFromCode(code: string): SymbolLookup | undefined {
    if (codeToSymbolCache === null) {
        codeToSymbolCache = buildCodeToSymbolMap();
    }
    return codeToSymbolCache.get(code);
}

/**
 * Convert a SCREAMING_SNAKE_CASE error code to its lowercase-kebab URL slug.
 *
 * @param code - SCREAMING_SNAKE_CASE error code.
 * @returns Lowercase kebab-case string.
 */
function kebab(code: string): string {
    return code.toLowerCase().replace(/_/g, '-');
}

/**
 * Escape double-quote characters in a YAML scalar value so the resulting
 * description field is safely embeddable in unquoted YAML frontmatter.
 *
 * @param s - Raw description string.
 * @returns Escaped string safe for YAML scalar context.
 */
function escapeYaml(s: string): string {
    return s.replace(/"/g, '\\"');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main();
}
