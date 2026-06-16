import { describe, expect, it } from 'vitest';
import { rehypeLinkSymbolsInCode } from './rehype-link-symbols-in-code';

type Element = { type: 'element'; tagName: string; properties?: Record<string, unknown>; children?: Node[] };
type Text = { type: 'text'; value: string };
type Root = { type: 'root'; children: Node[] };
type Node = Element | Text;

function el(tagName: string, properties: Record<string, unknown>, children: Node[] = []): Element {
    return { type: 'element', tagName, properties, children };
}

function text(value: string): Text {
    return { type: 'text', value };
}

describe('rehypeLinkSymbolsInCode', () => {
    it('wraps a token span in an anchor when the token resolves', () => {
        // Build a hast tree mirroring Shiki's output: figure.shiki > div > pre > code > span.line > span(token)
        const tokenSpan: Element = el('span', { style: '--shiki-light:#6F42C1' }, [text('Article')]);
        const tree: Root = {
            type: 'root',
            children: [
                el('figure', { className: ['shiki', 'shiki-themes'] }, [
                    el('div', { className: ['scroll-wrap'] }, [
                        el('pre', {}, [el('code', {}, [el('span', { className: ['line'] }, [tokenSpan])])]),
                    ]),
                ]),
            ],
        };

        const plugin = rehypeLinkSymbolsInCode({
            indexPath: '/tmp/__fake__.json',
            context: { tab: 'docs' },
        });

        // Inject a tiny index directly via the cache-bypass: we'd need access. Instead, mock the file.
        // Trick: use the real `loadIndex` by writing a tiny JSON to a temp file.
        const fs = require('node:fs') as typeof import('node:fs');
        const tmp = `${require('node:os').tmpdir()}/symbol-index.test.json`;
        fs.writeFileSync(
            tmp,
            JSON.stringify({
                Article: [
                    {
                        url: '/reference/cms/article/',
                        kind: 'interface',
                        tab: 'reference',
                        pkg: 'cms',
                        subpath: 'index',
                    },
                ],
            }),
        );
        const realPlugin = rehypeLinkSymbolsInCode({
            indexPath: tmp,
            context: { tab: 'docs' },
        });
        realPlugin(tree);

        const lineEl = tree.children[0] && (tree.children[0] as Element).children![0];
        const preEl = lineEl && (lineEl as Element).children![0];
        const codeEl = preEl && (preEl as Element).children![0];
        const span = codeEl && (codeEl as Element).children![0];
        const newToken = span && (span as Element).children![0];
        expect((newToken as Element).tagName).toBe('a');
        expect((newToken as Element).properties).toMatchObject({
            href: '/reference/cms/article/',
            'data-symbol-tab': 'reference',
            'data-symbol-kind': 'interface',
            'data-symbol-code-link': '',
        });
        // unused vars guard
        void plugin;
    });

    it('skips non-shiki figures', () => {
        const tokenSpan: Element = el('span', {}, [text('Article')]);
        const tree: Root = {
            type: 'root',
            children: [
                el('figure', { className: ['not-shiki'] }, [
                    el('code', {}, [el('span', { className: ['line'] }, [tokenSpan])]),
                ]),
            ],
        };
        const fs = require('node:fs') as typeof import('node:fs');
        const tmp = `${require('node:os').tmpdir()}/symbol-index.test2.json`;
        fs.writeFileSync(
            tmp,
            JSON.stringify({
                Article: [{ url: '/x/', kind: 'interface', tab: 'reference' }],
            }),
        );
        rehypeLinkSymbolsInCode({ indexPath: tmp, context: { tab: 'docs' } })(tree);
        const figure = tree.children[0] as Element;
        const code = figure.children![0] as Element;
        const lineSpan = code.children![0] as Element;
        const token = lineSpan.children![0] as Element;
        expect(token.tagName).toBe('span'); // unchanged
    });
});
