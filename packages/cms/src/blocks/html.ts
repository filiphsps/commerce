import type { Block } from 'payload';
import { toFieldConfigs } from '../field-config-bridge';

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
    fields: toFieldConfigs(
        // The `access` admin-role gate and `admin.language`/`admin.description`
        // editor metadata are Payload runtime concerns the descriptor DSL omits,
        // so the code field is mixed through the bridge raw. Unrestricted raw
        // HTML is an XSS surface — hence create/update are admin-role only.
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
    ),
};
