import type { Config } from '@markdoc/markdoc';
import * as nodes from '@/markdoc/nodes';
import * as tags from '@/markdoc/tags';

export const config: Config = {
    nodes: {
        ...nodes,
    },
    tags: {
        ...tags,
    },
};
