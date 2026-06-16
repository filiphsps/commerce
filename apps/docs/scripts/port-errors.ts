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
 * Generate one MDX page per error code declared in `@nordcom/commerce-errors`.
 * Each code's hero, class, kind, HTTP status, and description come from the
 * package itself; a matching `{% card %}`-wrapped Markdoc file under
 * apps/landing/docs/errors/ is OPTIONAL and only layers on extra causes, prose,
 * and a code example. Output filename is lowercase-kebab(code), so
 * /docs/errors/api-unknown-locale/ resolves to API_UNKNOWN_LOCALE.
 *
 * @param options.quiet - When true, suppresses console output.
 * @returns Count of generated pages.
 */
export function main({ quiet = false }: { quiet?: boolean } = {}): { converted: number } {
    fs.mkdirSync(ERRORS_OUT, { recursive: true });
    const touched = new Set<string>();
    // _overrides.json and index.mdx are checked into the repo — preserve them through prune.
    touched.add(path.join(ERRORS_OUT, '_overrides.json'));
    touched.add(path.join(ERRORS_OUT, 'index.mdx'));

    // Hand-authored Markdoc pages enrich a code with extra prose, causes, and a
    // code example. They are OPTIONAL — keyed by code, present only when an error
    // earns more documentation than the package metadata alone provides.
    const sources = new Map<string, string>();
    if (fs.existsSync(ERRORS_SRC)) {
        for (const file of fs.readdirSync(ERRORS_SRC)) {
            if (!file.endsWith('.mdx')) continue;
            sources.set(file.replace(/\.mdx$/, ''), fs.readFileSync(path.join(ERRORS_SRC, file), 'utf8'));
        }
    }

    // The errors package is the source of truth for which codes exist: every code
    // mapped by `getErrorFromCode` in `@nordcom/commerce-errors` gets a page,
    // whether or not a hand-authored enrichment file accompanies it. Union the
    // rare hand-authored page that lacks a matching package code so nothing
    // checked in is dropped.
    const codes = Array.from(new Set([...collectAllCodes(), ...sources.keys()]));
    const groups = buildGroups(codes);
    const codeToGroup = new Map<string, string>();
    for (const [group, list] of Object.entries(groups)) for (const c of list) codeToGroup.set(c, group);

    let converted = 0;
    for (const code of codes) {
        const group = codeToGroup.get(code) ?? 'general';
        const related = (groups[group] ?? []).filter((c) => c !== code).slice(0, 6);
        const mdx = convertOne(code, sources.get(code) ?? '', related);
        const dest = path.join(ERRORS_OUT, `${kebab(code)}.mdx`);
        writeIfChanged(dest, mdx, touched);
        converted++;
    }

    emitErrorsMeta(codes, touched);

    const pruned = pruneUntouched(ERRORS_OUT, touched);
    if (!quiet) console.info(`[port-errors] converted ${converted} pages, ${pruned} pruned`);
    return { converted };
}

/**
 * Group every code by the error-kind it belongs to in the package
 * (`ApiErrorKind` → `api`, `GenericErrorKind` → `general`), honoring the
 * hand-curated override map in `_overrides.json` for codes that should sit in a
 * named group regardless of kind. Shared by both the meta.json emitter and the
 * per-page related-codes renderer.
 *
 * @param codes - Flat list of error codes.
 * @returns Map from group key to ordered list of codes.
 */
function buildGroups(codes: string[]): Record<string, string[]> {
    const overridesPath = path.join(ERRORS_OUT, '_overrides.json');
    const overrides = fs.existsSync(overridesPath)
        ? (JSON.parse(fs.readFileSync(overridesPath, 'utf8')) as Record<string, string[]>)
        : {};
    const overrideSet = new Set(Object.values(overrides).flat());
    // Seed override groups first so curated codes keep their declared order.
    const groups: Record<string, string[]> = {};
    for (const [group, list] of Object.entries(overrides)) groups[group] = [...list];
    for (const code of codes) {
        if (overrideSet.has(code)) continue;
        const group = groupForCode(code);
        groups[group] ??= [];
        groups[group].push(code);
    }
    return groups;
}

/**
 * Resolve the sidebar group key for a code from its package kind, falling back
 * to the code's SCREAMING_SNAKE prefix when the code maps to no known class.
 *
 * @param code - SCREAMING_SNAKE_CASE error code.
 * @returns Group key (`api`, `general`, or a lowercased prefix fallback).
 */
function groupForCode(code: string): string {
    const kind = resolveClassFromCode(code)?.kind;
    if (kind === 'ApiErrorKind') return 'api';
    if (kind === 'GenericErrorKind') return 'general';
    return (code.split('_')[0] ?? 'general').toLowerCase();
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
function convertOne(code: string, src: string, related: string[]): string {
    const sections = parseSections(src);
    const lookup = resolveClassFromCode(code);
    // Prefer the hand-authored Documentation section, then fall back to the
    // package class's own `description`/`details` fields so a code with no
    // enrichment file still gets a meaningful summary.
    const description = sections.documentation || lookup?.description || lookup?.details || `Error ${code}.`;

    const frontmatter = ['---', `title: ${code}`, `description: ${yamlScalar(description)}`, '---', ''].join('\n');

    const heroProps: string[] = [`code="${code}"`, `description=${jsxAttr(description)}`];
    if (lookup) {
        heroProps.push(`errorClass="${lookup.className}"`);
        heroProps.push(`kind="${lookup.kind}"`);
        heroProps.push(`classHref="/reference/errors/${kebabClass(lookup.className)}/"`);
        if (lookup.statusCode !== undefined) heroProps.push(`httpStatus={${lookup.statusCode}}`);
    }
    const hero = `<ErrorHero ${heroProps.join(' ')} />`;

    // MDX requires a blank line between a JSX tag and inline markdown so the
    // bullets inside <Causes> are still parsed as a list.
    const causesBlock = sections.causes
        ? ['## Possible causes', '', '<Causes>', '', sections.causes, '', '</Causes>'].join('\n')
        : '';

    // Tag the code fence with the package title so the Fumadocs figcaption
    // renders the package path in the codeblock title bar.
    const codeWithTitle = sections.code.replace(/^```(\w*)\b/m, '```$1 title="@nordcom/commerce-errors"');
    const codeBlock = codeWithTitle ? ["## How it's thrown", '', codeWithTitle].join('\n') : '';

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

    const relatedBlock = related.length
        ? [
              '## Related errors',
              '',
              `<RelatedErrors items={${JSON.stringify(
                  related.map((c) => ({ code: c, href: `/errors/${kebab(c)}/` })),
              )}} />`,
          ].join('\n')
        : '';

    const slug = kebab(code);
    const helpUrl = `https://docs.nordcom.io/errors/${slug}/`;
    const editUrl = `https://github.com/filiphsps/commerce/edit/master/apps/landing/docs/errors/${code}.mdx`;
    const footer = `<StableHelpUrl href="${helpUrl}" editUrl="${editUrl}" />`;

    return [frontmatter, hero, '', causesBlock, '', codeBlock, '', thrownFrom, '', relatedBlock, '', footer, ''].join(
        '\n',
    );
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
 * Render a string value as a double-quoted JSX attribute. JSX/MDX attribute
 * strings have no backslash escaping, so a value carrying both quote styles
 * cannot be made safe by switching delimiters — every reserved character is
 * emitted as an HTML character reference instead. `&` is encoded first so the
 * brace and quote references below are not themselves double-encoded; MDX
 * decodes all four back to their literal characters.
 *
 * @param value - The raw attribute value.
 * @returns A double-quoted JSX-attribute literal including the surrounding quotes.
 */
function jsxAttr(value: string): string {
    const escaped = value
        .replace(/&/g, '&amp;')
        .replace(/\{/g, '&#123;')
        .replace(/\}/g, '&#125;')
        .replace(/"/g, '&quot;');
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
 * Emit a Fumadocs meta.json for the errors tab, grouping codes by their package
 * error-kind with a hand-curated override map read from
 * `content/errors/_overrides.json`. Codes listed in the override map are placed
 * in the named group instead of their natural kind group.
 *
 * Uses the Fumadocs `--<label>` separator syntax inside the `pages` array to
 * render group headers in the sidebar. If separators don't render in the
 * installed Fumadocs version, migrate to per-category subfolders and update
 * this function accordingly.
 *
 * @param codes - All converted SCREAMING_SNAKE_CASE error codes.
 */
function emitErrorsMeta(codes: string[], touched: Set<string>): void {
    const groups = buildGroups(codes);
    const pages: string[] = [];
    // Tab root index page first — keeps the sidebar tree rooted at this folder.
    if (fs.existsSync(path.join(ERRORS_OUT, 'index.mdx'))) pages.push('index');
    for (const [group, list] of Object.entries(groups).sort()) {
        if (list.length === 0) continue;
        // Fumadocs separator syntax: `---Label---` renders a sidebar group header.
        // Append the count so the sidebar shows e.g. `API · 33`.
        const base = group === 'general' ? 'General' : group.toUpperCase();
        const label = `${base} · ${list.length}`;
        pages.push(`---${label}---`, ...list.map((c) => c.toLowerCase().replace(/_/g, '-')));
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

type SymbolLookup = { className: string; kind: string; statusCode?: number; details?: string; description?: string };

/** Class fields lifted off each `export class` declaration, before chain resolution. */
type ClassMeta = { parent: string; statusCode?: number; details?: string; description?: string };

/** Lazily populated cache from parsing the errors package switch. */
let codeToSymbolCache: Map<string, SymbolLookup> | null = null;

/** Lazily populated cache of every code declared by the two error-kind enums. */
let allCodesCache: string[] | null = null;

/**
 * Read the errors package source, throwing a clear error when it is missing.
 *
 * @throws {Error} When the errors package source file is not found; the whole
 *   errors tab is generated from it.
 * @returns The file contents of `packages/errors/src/index.ts`.
 */
function readErrorsPkgSrc(): string {
    if (!fs.existsSync(ERRORS_PKG_SRC)) {
        throw new Error(
            `[port-errors] Cannot find ${ERRORS_PKG_SRC}. The errors tab is generated from the errors package source.`,
        );
    }
    return fs.readFileSync(ERRORS_PKG_SRC, 'utf8');
}

/**
 * Collect (and cache) every SCREAMING_SNAKE_CASE code declared by the
 * `GenericErrorKind` and `ApiErrorKind` enums — the canonical set of codes the
 * package exposes, mirroring `getAllErrorCodes()` without importing the built
 * package. Enum member names equal their string values, so the names double as
 * the file-based slugs used throughout this script.
 *
 * @returns Ordered list of every declared error code.
 */
function collectAllCodes(): string[] {
    if (allCodesCache !== null) return allCodesCache;
    const src = readErrorsPkgSrc();
    const codes: string[] = [];
    for (const block of src.matchAll(/export enum \w+ErrorKind\s*\{([\s\S]*?)\n\}/g)) {
        for (const member of (block[1] as string).matchAll(/^\s*(\w+)\s*=/gm)) codes.push(member[1] as string);
    }
    allCodesCache = codes;
    return codes;
}

/**
 * Read a string-literal class field's declared value from a class body,
 * ignoring `this.`-prefixed constructor reassignments of the same field.
 *
 * @param body - The class body source.
 * @param field - Field name to read (e.g. `description`).
 * @returns The declared string value, or undefined when not declared.
 */
function matchField(body: string, field: string): string | undefined {
    const m = body.match(new RegExp(`(?<![.\\w])${field}\\s*=\\s*(['"\`])([\\s\\S]*?)\\1`));
    return m ? (m[2] as string) : undefined;
}

/**
 * Parse `packages/errors/src/index.ts`'s `getErrorFromCode` switch statement
 * to build a map from SCREAMING_SNAKE error code (enum member name) to its
 * class name, kind enum, and resolved HTTP status, `details`, and
 * `description` — each walked up the `extends` chain when the class itself
 * doesn't declare the field.
 *
 * @throws {Error} When the errors package source file is not found.
 * @returns Map from code string to its resolved {@link SymbolLookup}.
 */
function buildCodeToSymbolMap(): Map<string, SymbolLookup> {
    const src = readErrorsPkgSrc();

    // Lift parent + declared class fields off each `export class X extends Y { ... }`.
    const classes = new Map<string, ClassMeta>();
    for (const m of src.matchAll(/export class (\w+)\s+extends\s+([\w<>\s,]+?)\s*\{([\s\S]*?)\n\}/g)) {
        const name = m[1] as string;
        const parent = ((m[2] as string).split(/[<\s,]/)[0] ?? '') as string;
        const body = m[3] as string;
        const statusMatch = body.match(/statusCode\s*=\s*(\d+)/);
        classes.set(name, {
            parent,
            statusCode: statusMatch ? Number(statusMatch[1]) : undefined,
            details: matchField(body, 'details'),
            description: matchField(body, 'description'),
        });
    }

    // Resolve a class field by walking the extends chain until one declares it.
    const resolve = <K extends keyof ClassMeta>(className: string, field: K): ClassMeta[K] | undefined => {
        let current: string | undefined = className;
        const seen = new Set<string>();
        while (current && !seen.has(current)) {
            seen.add(current);
            const entry = classes.get(current);
            if (!entry) return undefined;
            if (entry[field] !== undefined) return entry[field];
            current = entry.parent;
        }
        return undefined;
    };

    const map = new Map<string, SymbolLookup>();
    for (const m of src.matchAll(/case (\w+ErrorKind)\.(\w+):[\s\S]*?return (\w+)/g)) {
        const kind = m[1] as string;
        const memberName = m[2] as string;
        const className = (m[3] as string).split(/\s/)[0] as string;
        map.set(memberName, {
            className,
            kind,
            statusCode: resolve(className, 'statusCode'),
            details: resolve(className, 'details'),
            description: resolve(className, 'description'),
        });
    }
    return map;
}

/**
 * Return (and cache) the parsed code → symbol map, building it at most once.
 *
 * @returns Map from every mapped error code to its {@link SymbolLookup}.
 */
function loadCodeToSymbolMap(): Map<string, SymbolLookup> {
    if (codeToSymbolCache === null) {
        codeToSymbolCache = buildCodeToSymbolMap();
    }
    return codeToSymbolCache;
}

/**
 * Resolve the symbol lookup for a given SCREAMING_SNAKE_CASE code string.
 *
 * @param code - SCREAMING_SNAKE_CASE error code (file-based, matches enum member name).
 * @returns Resolved {@link SymbolLookup}, or undefined when the code is unknown.
 */
function resolveClassFromCode(code: string): SymbolLookup | undefined {
    return loadCodeToSymbolMap().get(code);
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
 * Render a string as a double-quoted YAML scalar safe for frontmatter. Wrapping
 * in quotes (escaping `\` then `"`) keeps values carrying YAML indicators — a
 * mid-string `: `, a leading backtick, `#`, etc. — from being misparsed as a
 * nested mapping, which js-yaml reports as "bad indentation of a mapping entry".
 *
 * @param s - Raw description string.
 * @returns A double-quoted, escaped YAML scalar including the surrounding quotes.
 */
function yamlScalar(s: string): string {
    return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main();
}
