import type { Block } from 'payload';

/**
 * Payload block definition for raw HTML injection. Create and update are
 * restricted to the `admin` role — unrestricted use is an XSS surface.
 *
 * @example
 *   blocks: [htmlBlock]
 */
export const htmlBlock: Block = {
    slug: 'html',
    interfaceName: 'HtmlBlock',
    fields: [
        {
            name: 'html',
            type: 'code',
            admin: {
                language: 'html',
                description: 'Raw HTML. Admin role only — XSS surface.',
            },
            required: true,
            access: {
                create: ({ req }) => req?.user?.role === 'admin',
                update: ({ req }) => req?.user?.role === 'admin',
            },
        },
    ],
};
