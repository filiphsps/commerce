import type { IconManifestEntry } from './types';

const BEGIN = '<!-- BEGIN_ICON_LIST -->';
const END = '<!-- END_ICON_LIST -->';

export function rewriteIconList(readme: string, entries: readonly IconManifestEntry[]): string {
    const hasBegin = readme.includes(BEGIN);
    const hasEnd = readme.includes(END);
    if (!hasBegin && !hasEnd) return readme;
    if (hasBegin !== hasEnd) {
        throw new Error('README has only one of BEGIN_ICON_LIST / END_ICON_LIST marker — both must be present.');
    }

    const header = '| Slug | Component | Title |\n|---|---|---|\n';
    const rows = entries.map((e) => `| \`${e.slug}\` | \`${e.componentName}\` | ${e.title} |`).join('\n');
    const block = `${BEGIN}\n${header}${rows}\n${END}`;

    const pattern = new RegExp(`${BEGIN}[\\s\\S]*?${END}`);
    return readme.replace(pattern, block);
}
