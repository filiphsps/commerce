import type { Field } from 'payload';

export type BridgeAdapter<TDoc = unknown> = {
    findById: (id: string) => Promise<TDoc | null>;
    update: (id: string, patch: Partial<TDoc>) => Promise<TDoc>;
    create?: (input: Partial<TDoc>) => Promise<TDoc>;
    delete?: (id: string) => Promise<void>;
};

export type BridgeAccessCtx = {
    user: { id: string; role?: string; tenants?: string[] } | null;
    domain: string;
};

export type BridgeAccess = (ctx: BridgeAccessCtx) => boolean | Promise<boolean>;

export type BridgeManifest<TDoc = unknown> = {
    slug: string;
    label: { singular: string; plural: string };
    fields: Field[];
    adapter: BridgeAdapter<TDoc>;
    access: {
        read: BridgeAccess;
        update: BridgeAccess;
        delete?: BridgeAccess;
        create?: BridgeAccess;
    };
    toFormValues?: (doc: TDoc) => Record<string, unknown>;
    fromFormValues?: (values: Record<string, unknown>) => Partial<TDoc>;
};

export const defineBridge = <TDoc>(m: BridgeManifest<TDoc>): BridgeManifest<TDoc> => m;

export const assertUniqueSlugs = (manifests: readonly BridgeManifest[]): void => {
    const seen = new Set<string>();
    for (const m of manifests) {
        if (seen.has(m.slug)) {
            throw new Error(`[bridge] duplicate bridge slug: ${m.slug}`);
        }
        seen.add(m.slug);
    }
};

export const assertFieldsValid = (manifests: readonly BridgeManifest[]): void => {
    for (const m of manifests) {
        for (const field of m.fields) {
            const f = field as { name?: string; type?: string };
            if (!f.type) {
                throw new Error(`[bridge] manifest "${m.slug}": field missing \`type\``);
            }
            if (!f.name) {
                throw new Error(`[bridge] manifest "${m.slug}": field missing \`name\` (type=${f.type})`);
            }
        }
    }
};
