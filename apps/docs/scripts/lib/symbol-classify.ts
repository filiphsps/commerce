import {
    KIND_CLASS,
    KIND_ENUM,
    KIND_FUNCTION,
    KIND_INTERFACE,
    KIND_TYPE_ALIAS,
    KIND_VARIABLE,
    type TypeDocSymbol,
} from './typedoc-types';

export type SymbolFate = 'own-page' | 'inline' | 'excluded';
export type SymbolKindLabel = 'function' | 'class' | 'component' | 'type' | 'interface' | 'variable' | 'enum' | 'other';

/**
 * Decide whether a symbol gets its own page, sits inline on the subpath overview,
 * or is excluded entirely. Per spec §Reference depth rule.
 *
 * @param symbol - The serialised TypeDoc symbol.
 * @returns Fate plus a normalised kind label for use in templates.
 */
export function classifySymbol(symbol: TypeDocSymbol): { fate: SymbolFate; kind: SymbolKindLabel } {
    if (symbol.flags?.isInternal || hasModifierTag(symbol, 'internal')) {
        return { fate: 'excluded', kind: 'other' };
    }

    if (symbol.kind === KIND_FUNCTION) {
        return { fate: 'own-page', kind: isReactComponent(symbol) ? 'component' : 'function' };
    }
    if (symbol.kind === KIND_CLASS) {
        return { fate: 'own-page', kind: 'class' };
    }
    if (symbol.kind === KIND_INTERFACE) {
        return { fate: 'inline', kind: 'interface' };
    }
    if (symbol.kind === KIND_TYPE_ALIAS) {
        return { fate: 'inline', kind: 'type' };
    }
    if (symbol.kind === KIND_VARIABLE) {
        return { fate: 'inline', kind: 'variable' };
    }
    if (symbol.kind === KIND_ENUM) {
        return { fate: 'inline', kind: 'enum' };
    }
    return { fate: 'inline', kind: 'other' };
}

/**
 * Heuristic: a function is a React component when its name begins with an
 * uppercase letter and its return type is JSX-ish. We can't read the full
 * type checker here, so the name heuristic plus return-type-string-match
 * is the pragmatic answer.
 */
function isReactComponent(symbol: TypeDocSymbol): boolean {
    if (!/^[A-Z]/.test(symbol.name)) return false;
    const ret = symbol.signatures?.[0]?.type;
    if (!ret) return false;
    const flat = JSON.stringify(ret);
    return /JSX\.Element|React\.JSX\.Element|ReactNode|ReactElement/.test(flat);
}

/**
 * Check whether a symbol's JSDoc carries a specific modifier tag such as `@internal`.
 *
 * @param symbol - The TypeDoc symbol to inspect.
 * @param tag - The tag name without the `@` prefix.
 * @returns `true` when the tag is present.
 */
function hasModifierTag(symbol: TypeDocSymbol, tag: string): boolean {
    return symbol.comment?.modifierTags?.includes(`@${tag}`) ?? false;
}
