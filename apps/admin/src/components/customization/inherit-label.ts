/** The scope a customization setting is authored in: the store-wide base or one specific surface. */
export type SettingScope = 'base' | 'surface';

/**
 * The provenance label shown on an inheriting customization field's ghost, naming the tier its value
 * falls through to. A base-scope field inherits the platform default; a surface-scope field inherits
 * the store-wide `base` when that scope sets the key, otherwise the platform default. Keeps the
 * generic overridable widget free of the productCard scope convention — `ComponentSection` computes
 * this from the active scope and the base form state and injects it. See `docs/adr/0004`.
 *
 * @param input.scope - Whether the field is authored in the store-wide base or a surface scope.
 * @param input.baseSet - For a surface scope, whether the store-wide base sets this same key.
 * @returns The provenance label (`Base` or `Platform default`).
 */
export function inheritSourceLabel({ scope, baseSet }: { scope: SettingScope; baseSet: boolean }): string {
    if (scope === 'surface' && baseSet) {
        return 'Base';
    }
    return 'Platform default';
}
