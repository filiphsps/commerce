import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAllErrorCodes } from '@nordcom/commerce-errors';
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
