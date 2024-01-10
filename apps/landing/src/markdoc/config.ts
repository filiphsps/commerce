import * as nodes from '@/markdoc/nodes';
import * as tags from '@/markdoc/tags';
import type { Config } from '@markdoc/markdoc';

export const config: Config = {
    nodes: {
        ...nodes
    },
    tags: {
        ...tags
    }
};
