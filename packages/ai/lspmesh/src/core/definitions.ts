const DEFINITION_SNIPPET =
    /^(export\s+)?(default\s+)?(declare\s+)?(abstract\s+)?(async\s+)?(public\s+|private\s+|protected\s+|static\s+|readonly\s+)*(const|let|var|function|function\*|class|interface|type|enum|namespace|module)\b/;

/** Whether a source line looks like a definition, not an import or re-export. */
export const isDefinitionSnippet = (snip: string): boolean => {
    if (/^import\b/.test(snip) || /\bfrom\s+['"]/.test(snip)) return false;
    if (/^export\s+\{/.test(snip) || /^export\s+\*/.test(snip)) return false;
    return DEFINITION_SNIPPET.test(snip);
};
