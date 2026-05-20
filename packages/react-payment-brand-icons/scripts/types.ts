export type { IconManifestEntry } from '../src/types';

export type IconOverride = {
    componentName?: string;
    title?: string;
    aliases?: readonly string[];
};

export type IconOverrides = Record<string, IconOverride>;
