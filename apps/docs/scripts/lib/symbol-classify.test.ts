import { describe, expect, it } from 'vitest';
import { classifySymbol } from './symbol-classify';
import { KIND_CLASS, KIND_FUNCTION, KIND_INTERFACE, KIND_TYPE_ALIAS, KIND_VARIABLE } from './typedoc-types';

describe('classifySymbol', () => {
    it('puts a plain function on its own page', () => {
        const result = classifySymbol({
            id: 1,
            name: 'getArticle',
            kind: KIND_FUNCTION,
            signatures: [{ id: 2, name: 'getArticle', kind: KIND_FUNCTION }],
        });
        expect(result).toEqual({ fate: 'own-page', kind: 'function' });
    });

    it('classifies an uppercase function returning JSX.Element as a component', () => {
        const result = classifySymbol({
            id: 1,
            name: 'Card',
            kind: KIND_FUNCTION,
            signatures: [
                { id: 2, name: 'Card', kind: KIND_FUNCTION, type: { type: 'reference', name: 'JSX.Element' } },
            ],
        });
        expect(result).toEqual({ fate: 'own-page', kind: 'component' });
    });

    it('puts a class on its own page', () => {
        const result = classifySymbol({ id: 1, name: 'NotFoundError', kind: KIND_CLASS });
        expect(result).toEqual({ fate: 'own-page', kind: 'class' });
    });

    it('puts interfaces on their own page so child type names resolve to a real URL', () => {
        const result = classifySymbol({ id: 1, name: 'ShopRef', kind: KIND_INTERFACE });
        expect(result).toEqual({ fate: 'own-page', kind: 'interface' });
    });

    it('puts type aliases on their own page so child type names resolve to a real URL', () => {
        const result = classifySymbol({ id: 1, name: 'LocaleCode', kind: KIND_TYPE_ALIAS });
        expect(result).toEqual({ fate: 'own-page', kind: 'type' });
    });

    it('keeps variables inline', () => {
        const result = classifySymbol({ id: 1, name: 'cmsConfig', kind: KIND_VARIABLE });
        expect(result).toEqual({ fate: 'inline', kind: 'variable' });
    });

    it('excludes @internal symbols', () => {
        const result = classifySymbol({
            id: 1,
            name: 'internalHelper',
            kind: KIND_FUNCTION,
            comment: { modifierTags: ['@internal'] },
        });
        expect(result).toEqual({ fate: 'excluded', kind: 'other' });
    });
});
