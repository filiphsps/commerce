import type { INode } from 'svgson';

const URL_REF = /url\(#([^)]+)\)/g;
const HREF_ATTRS = ['href', 'xlink:href'];

function walk(node: INode, visit: (n: INode) => void): void {
    visit(node);
    for (const child of node.children) walk(child, visit);
}

export function prefixIds(root: INode, slug: string): void {
    const prefix = `${slug}-`;
    const seen = new Set<string>();
    walk(root, (node) => {
        const id = node.attributes.id;
        if (id && !seen.has(id)) seen.add(id);
    });
    if (seen.size === 0) return;

    const rewrite = (oldId: string) => `${prefix}${oldId}`;

    walk(root, (node) => {
        if (node.attributes.id && seen.has(node.attributes.id)) {
            node.attributes.id = rewrite(node.attributes.id);
        }
        for (const [attr, value] of Object.entries(node.attributes)) {
            if (typeof value !== 'string') continue;

            if (URL_REF.test(value)) {
                URL_REF.lastIndex = 0;
                node.attributes[attr] = value.replace(URL_REF, (_, id) =>
                    seen.has(id) ? `url(#${rewrite(id)})` : `url(#${id})`,
                );
                URL_REF.lastIndex = 0;
            }

            if (HREF_ATTRS.includes(attr) && value.startsWith('#')) {
                const id = value.slice(1);
                if (seen.has(id)) node.attributes[attr] = `#${rewrite(id)}`;
            }
        }
    });
}
