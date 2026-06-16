import { readFileSync } from 'node:fs';

import type { Location, LocationLink } from 'vscode-languageserver-protocol';

/** Filesystem path for a `file://` URI (decodes `%5B` etc.). */
export const uriToPath = (uri: string): string => decodeURIComponent(uri.replace('file://', ''));

/** Repo-relative path for a `file://` URI, given a root dir. */
export const relPath = (uri: string, root: string): string => uriToPath(uri).replace(`${root}/`, '');

/** The trimmed source line at a 0-based line number, capped at 200 chars. */
export const snippet = (uri: string, line: number): string => {
    try {
        const lines = readFileSync(uriToPath(uri), 'utf8').split('\n');
        return (lines[line] ?? '').trim().slice(0, 200);
    } catch {
        return '';
    }
};

/** Normalize a {@link Location} or {@link LocationLink} to a plain `{uri, range}`. */
export const normLoc = (l: Location | LocationLink): Location => {
    if ('targetUri' in l) return { uri: l.targetUri, range: l.targetSelectionRange ?? l.targetRange };
    return l;
};
