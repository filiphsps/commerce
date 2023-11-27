import * as nodes from '@/utils/markdoc/nodes';
import * as tags from '@/utils/markdoc/tags';
import type { Config } from '@markdoc/markdoc';

export const config: Config = {
    nodes: {
        ...nodes
    },
    tags: {
        ...tags
    }
};
