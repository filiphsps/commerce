import { Tag } from '@markdoc/markdoc';

export const link = {
    render: 'Link',
    attributes: {
        href: {
            type: String
        }
    }
};

export const fence = {
    render: 'Fence',
    attributes: {
        content: {
            type: String
        },
        language: {
            type: String
        }
    }
};

export const code = {
    render: 'Code',
    children: ['inline'],
    attributes: {
        content: {
            type: String
        },
        'data-language': {
            type: String
        }
    }
};

export const heading = {
    render: 'Heading',
    children: ['inline'],
    attributes: {
        id: { type: String },
        level: { type: Number, required: true, default: 1 },
        className: { type: String }
    },
    transform(node: any, config: any) {
        const { level, ...attributes } = node.transformAttributes(config);
        const children = node.transformChildren(config);

        return new Tag(this.render as any, { ...attributes, level: `h${level}`, 'data-level': `h${level}` }, children);
    }
};
