import type { IconManifestEntry } from './types';

export function validateManifest(entries: readonly IconManifestEntry[]): void {
    const slugs = new Map<string, IconManifestEntry>();
    const names = new Map<string, IconManifestEntry>();
    const aliases = new Map<string, IconManifestEntry>();

    for (const e of entries) {
        if (slugs.has(e.slug)) {
            throw new Error(`Duplicate slug "${e.slug}" used by multiple manifest entries.`);
        }
        slugs.set(e.slug, e);

        const existingName = names.get(e.componentName);
        if (existingName) {
            throw new Error(
                `Duplicate componentName "${e.componentName}" used by slugs: ${existingName.slug}, ${e.slug}.`,
            );
        }
        names.set(e.componentName, e);
    }

    for (const e of entries) {
        for (const alias of e.aliases) {
            if (slugs.has(alias) && slugs.get(alias) !== e) {
                throw new Error(`Alias "${alias}" on slug "${e.slug}" collides with canonical slug "${alias}".`);
            }
            const existingAlias = aliases.get(alias);
            if (existingAlias && existingAlias !== e) {
                throw new Error(
                    `Alias "${alias}" on slug "${e.slug}" declared on multiple icons: ${existingAlias.slug}, ${e.slug}.`,
                );
            }
            aliases.set(alias, e);
        }
    }
}
