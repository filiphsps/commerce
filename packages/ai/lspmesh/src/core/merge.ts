import type { Location, LocationLink } from 'vscode-languageserver-protocol';

import { normLoc } from '@/core/locations';

type LocReply = Location | Location[] | LocationLink[] | null | undefined;

/** Union + dedupe location replies from several backends, keyed by uri:line:character. */
export const mergeLocations = (replies: LocReply[]): Location[] => {
    const seen = new Map<string, Location>();
    for (const reply of replies) {
        if (!reply) continue;
        const arr = Array.isArray(reply) ? reply : [reply];
        for (const raw of arr) {
            const l = normLoc(raw);
            const key = `${l.uri}:${l.range.start.line}:${l.range.start.character}`;
            if (!seen.has(key)) seen.set(key, l);
        }
    }
    return [...seen.values()];
};
