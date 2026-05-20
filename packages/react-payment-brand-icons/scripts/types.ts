export type IconOverride = {
    componentName?: string;
    title?: string;
    aliases?: readonly string[];
};

export type IconOverrides = Record<string, IconOverride>;

export type IconManifestEntry = {
    slug: string;
    componentName: string;
    title: string;
    aliases: readonly string[];
};
