/**
 * Playwright helpers that turn {@link ViewportPreset}s into project configs, so
 * every app drives the same device matrix from one source of truth.
 *
 * Types are declared structurally rather than imported from `@playwright/test`
 * so this module carries no hard runtime dependency on Playwright — the spread
 * result drops straight into a `defineConfig({ projects: [...] })`.
 */

import { CORE_RESPONSIVE_MATRIX, type ViewportPreset } from './presets';

/** The subset of a Playwright project `use` block these helpers emit. */
export type ResponsiveUse = {
    viewport: { width: number; height: number };
    deviceScaleFactor: number;
    isMobile: boolean;
    hasTouch: boolean;
};

/** A Playwright project config carrying a viewport preset's emulation settings. */
export type ResponsiveProject<TUse = Record<string, unknown>> = {
    name: string;
    use: TUse & ResponsiveUse;
};

/**
 * Maps a preset to the Playwright `use` fields that emulate it.
 *
 * `isMobile` is only emitted on touch presets because the Chromium-only flag
 * throws under the Firefox/WebKit engines; pairing it with `touch` keeps it on
 * the devices that actually need it.
 *
 * @param preset - The viewport preset to emulate.
 * @returns The Playwright `use` emulation block.
 */
export function presetToUse(preset: ViewportPreset): ResponsiveUse {
    return {
        viewport: { width: preset.width, height: preset.height },
        deviceScaleFactor: preset.deviceScaleFactor,
        isMobile: preset.touch,
        hasTouch: preset.touch,
    };
}

/** Options for {@link responsiveProjects}. */
export type ResponsiveProjectsOptions<TUse> = {
    /** Presets to fan out over. Defaults to {@link CORE_RESPONSIVE_MATRIX}. */
    presets?: readonly ViewportPreset[];
    /** Shared `use` merged under each project's emulation block (auth state, baseURL, …). */
    baseUse?: TUse;
    /** Prefix for generated project names. Defaults to `responsive`. */
    prefix?: string;
};

/**
 * Builds one Playwright project per preset, naming each `"<prefix>:<id>"` and
 * merging {@link ResponsiveProjectsOptions.baseUse} under the emulation block so
 * shared settings (storage state, baseURL) ride along on every device.
 *
 * @param options - Presets, shared `use`, and name prefix.
 * @returns Project configs to spread into `defineConfig({ projects })`.
 */
export function responsiveProjects<TUse extends Record<string, unknown> = Record<string, unknown>>(
    options: ResponsiveProjectsOptions<TUse> = {},
): ResponsiveProject<TUse>[] {
    const { presets = CORE_RESPONSIVE_MATRIX, baseUse, prefix = 'responsive' } = options;
    return presets.map((preset) => ({
        name: `${prefix}:${preset.id}`,
        use: { ...(baseUse ?? ({} as TUse)), ...presetToUse(preset) },
    }));
}
