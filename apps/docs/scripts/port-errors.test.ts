import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAllErrorCodes } from '@nordcom/commerce-errors';
import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';
import { main } from './port-errors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ERRORS_OUT = path.resolve(__dirname, '../content/errors');
const kebab = (code: string) => code.toLowerCase().replace(/_/g, '-');

describe('port-errors', () => {
    it('emits a page for every code in the errors package, not just hand-authored ones', () => {
        const result = main({ quiet: true });
        const codes = getAllErrorCodes();

        expect(result.converted).toBe(codes.length);
        for (const code of codes) {
            expect(fs.existsSync(path.join(ERRORS_OUT, `${kebab(code)}.mdx`)), `missing page for ${code}`).toBe(true);
        }
    });

    it('derives the page from package metadata when no hand-authored source exists', () => {
        main({ quiet: true });

        // API_TOO_MANY_REQUESTS has no file under apps/landing/docs/errors.
        const body = fs.readFileSync(path.join(ERRORS_OUT, 'api-too-many-requests.mdx'), 'utf8');
        expect(body).toContain('title: API_TOO_MANY_REQUESTS');
        expect(body).toContain('errorClass="TooManyRequestsError"');
        // Description falls back to the package class's `description` field.
        expect(body).toMatch(/description=["']\S/);
    });

    it('emits frontmatter that parses as YAML even when the description carries YAML indicators', () => {
        main({ quiet: true });

        // A bare scalar carrying a mid-string `: ` or a leading backtick parses as
        // a nested mapping, which js-yaml rejects with "bad indentation of a
        // mapping entry". Parse the frontmatter of every generated page to prove
        // the description is quoted/escaped, not just well-formed by eye.
        for (const code of getAllErrorCodes()) {
            const body = fs.readFileSync(path.join(ERRORS_OUT, `${kebab(code)}.mdx`), 'utf8');
            const frontmatter = body.match(/^---\n([\s\S]*?)\n---/)?.[1];
            expect(frontmatter, `no frontmatter block for ${code}`).toBeDefined();
            const parsed = yaml.load(frontmatter as string) as { title: string; description: string };
            expect(parsed.title, `title drift for ${code}`).toBe(code);
            expect(typeof parsed.description, `non-string description for ${code}`).toBe('string');
        }

        // The two codes whose package descriptions carry YAML indicators — a
        // leading backtick and a mid-string `: ` — round-trip to their literal text.
        const fractional = yaml.load(
            fs
                .readFileSync(path.join(ERRORS_OUT, 'api-image-no-fractional.mdx'), 'utf8')
                .match(/^---\n([\s\S]*?)\n---/)?.[1] as string,
        ) as { description: string };
        expect(fractional.description).toBe('`width`/`height` must be an integer');
        const composite = yaml.load(
            fs
                .readFileSync(path.join(ERRORS_OUT, 'generic-localized-composite-field.mdx'), 'utf8')
                .match(/^---\n([\s\S]*?)\n---/)?.[1] as string,
        ) as { description: string };
        expect(composite.description).toContain('`localized: true`');
    });

    it('HTML-encodes JSX attribute values instead of backslash-escaping quotes', () => {
        main({ quiet: true });

        // INVALID_TYPE has a throw site carrying both quote styles:
        //   throw new TypeError('Lexical node is missing its "type" discriminant.');
        // JSX has no backslash escaping, so the embedded double quotes must become
        // `&quot;` and no `\'` may leak into an attribute.
        const body = fs.readFileSync(path.join(ERRORS_OUT, 'invalid-type.mdx'), 'utf8');
        expect(body).toContain('its &quot;type&quot; discriminant.');
        for (const line of body.split('\n')) {
            if (!line.includes('<ThrownFromCard') && !line.includes('<ErrorHero')) continue;
            expect(line.includes("\\'"), `backslash-escaped quote in JSX attr: ${line}`).toBe(false);
        }
    });

    it('groups the sidebar by package kind, not by snake-case prefix', () => {
        main({ quiet: true });

        const meta = JSON.parse(fs.readFileSync(path.join(ERRORS_OUT, 'meta.json'), 'utf8')) as { pages: string[] };
        const headers = meta.pages.filter((p) => p.startsWith('---')).map((p) => p.replace(/^---|·.*$/g, '').trim());
        // Exactly the two package kinds — no `INVALID_*`/`MISSING_*`/`NOT_*` fragments.
        expect(headers).toEqual(['API', 'General']);

        const counts = Object.fromEntries(
            meta.pages
                .filter((p) => p.startsWith('---'))
                .map((p) => {
                    const [, label, count] = p.match(/^---(.+?) · (\d+)---$/) ?? [];
                    return [label, Number(count)];
                }),
        );
        expect(counts.API + counts.General).toBe(getAllErrorCodes().length);
    });
});
