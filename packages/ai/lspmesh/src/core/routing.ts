import { extname } from 'node:path';

import type { BackendConfig } from '@/config/types';

/** Lowercased file extension including the dot, e.g. `/a/B.TSX` → `.tsx`. */
export const extnameLower = (path: string): string => extname(path).toLowerCase();

/** Whether a backend handles the file at `path`, by extension. */
export const matchesBackend = (backend: BackendConfig, path: string): boolean =>
    extnameLower(path) in backend.extensionToLanguage;

/** The LSP languageId a backend assigns to `path`, or `undefined` if unhandled. */
export const languageIdFor = (backend: BackendConfig, path: string): string | undefined =>
    backend.extensionToLanguage[extnameLower(path)];
