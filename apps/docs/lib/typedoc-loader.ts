// apps/docs/lib/typedoc-loader.ts
import fs from 'node:fs';
import path from 'node:path';

/** Subset of TypeDoc's serialized project shape — we read what we need, type-safely. */
export type TypeDocSymbol = {
    id: number;
    name: string;
    kind: number;
    signatures?: TypeDocSignature[];
    comment?: { summary?: { kind: string; text: string }[] };
    sources?: { fileName: string; line: number; url?: string }[];
    type?: TypeDocType;
};

export type TypeDocSignature = {
    id: number;
    name: string;
    kind: number;
    comment?: { summary?: { kind: string; text: string }[] };
    parameters?: { id: number; name: string; type?: TypeDocType }[];
    type?: TypeDocType;
};

export type TypeDocType = {
    type: string;
    name?: string;
    target?: number;
    typeArguments?: TypeDocType[];
};

export type TypeDocProject = {
    name: string;
    children?: TypeDocSymbol[];
    groups?: { title: string; children: number[] }[];
};

/** TypeDoc ReflectionKind values — see node_modules/typedoc/dist/lib/models/kind.d.ts. */
const KIND_VARIABLE = 32;
const KIND_FUNCTION = 64;
const KIND_CLASS = 128;
const KIND_INTERFACE = 256;
const KIND_TYPE_ALIAS = 2097152;

const KIND_LABELS: Record<number, string> = {
    [KIND_FUNCTION]: 'Functions',
    [KIND_INTERFACE]: 'Interfaces',
    [KIND_TYPE_ALIAS]: 'Types',
    [KIND_VARIABLE]: 'Variables',
    [KIND_CLASS]: 'Classes',
};

export function loadSubpathJson(rootDir: string, subpathKey: string): TypeDocProject {
    const file = path.join(rootDir, `${subpathKey}.json`);
    if (!fs.existsSync(file)) {
        throw new Error(
            `No TypeDoc JSON found for subpath "${subpathKey}" in ${rootDir}. ` +
                `Run \`pnpm --filter @nordcom/commerce-docs pre:typedoc\` first.`,
        );
    }
    return JSON.parse(fs.readFileSync(file, 'utf8')) as TypeDocProject;
}

export function groupSymbols(project: TypeDocProject): Record<string, TypeDocSymbol[]> {
    const groups: Record<string, TypeDocSymbol[]> = {};
    for (const child of project.children ?? []) {
        const label = KIND_LABELS[child.kind] ?? 'Other';
        const bucket = groups[label] ?? [];
        bucket.push(child);
        groups[label] = bucket;
    }
    return groups;
}

/** Resolve TYPEDOC_OUT relative to the docs app, regardless of caller cwd. */
export function getTypedocOutRoot(): string {
    return path.resolve(process.cwd(), '.typedoc-out');
}
