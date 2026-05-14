import type { Config, Node } from '@markdoc/markdoc';
import { Tag } from '@markdoc/markdoc';

// Allow only safe schemes + relative/anchor links. Markdown content is
// repo-controlled today, but the same node set is also used by the docs
// pipeline — adding a `validate` here means a stray `javascript:` link can't
// slip in via a typo or a future CMS-driven markdown source.
const SAFE_HREF_SCHEMES = /^(?:https?|mailto|tel):/i;
const SAFE_RELATIVE_HREF = /^(?:\/|#|\?|[a-z0-9])/i;
const isSafeHref = (href: unknown): boolean => {
    if (typeof href !== 'string') return false;
    const trimmed = href.trim();
    if (!trimmed) return false;
    if (SAFE_HREF_SCHEMES.test(trimmed)) return true;
    if (trimmed.includes(':')) return false;
    return SAFE_RELATIVE_HREF.test(trimmed);
};

export const link = {
    render: 'Link',
    attributes: {
        href: {
            type: String,
            validate(value: unknown) {
                if (!isSafeHref(value)) {
                    return [
                        {
                            id: 'unsafe-href',
                            level: 'error' as const,
                            message: 'Link href must be http(s), mailto, tel, or a relative/anchor path.',
                        },
                    ];
                }
                return [];
            },
        },
    },
};

export const fence = {
    render: 'Fence',
    attributes: {
        content: {
            type: String,
        },
        language: {
            type: String,
        },
    },
};

export const code = {
    render: 'Code',
    children: ['inline'],
    attributes: {
        content: {
            type: String,
        },
        'data-language': {
            type: String,
        },
    },
};

export const heading = {
    render: 'Heading',
    children: ['inline'],
    attributes: {
        id: { type: String },
        level: { type: Number, required: true, default: 1 },
        className: { type: String },
    },
    transform(node: Node, config: Config) {
        const { level, ...attributes } = node.transformAttributes(config);
        const children = node.transformChildren(config);

        return new Tag(this.render, { ...attributes, level: `h${level}`, 'data-level': `h${level}` }, children);
    },
};
