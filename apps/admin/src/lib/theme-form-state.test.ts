import { isHiddenEditorField } from '@nordcom/commerce-cms/editor';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockBuildFormState, mockGetFieldByPath } = vi.hoisted(() => ({
    mockBuildFormState: vi.fn(),
    mockGetFieldByPath: vi.fn(),
}));

vi.mock('@payloadcms/ui/utilities/buildFormState', () => ({
    buildFormState: mockBuildFormState,
}));

vi.mock('payload', () => ({
    getFieldByPath: mockGetFieldByPath,
}));

import { buildCmsFormState } from './build-cms-form-state';

/**
 * Phase 5.2 regression guard: the Theme Editor relies on every `theme.*` leaf
 * surviving in `FormState` so its `useField` controls bind and the save pipeline
 * round-trips the whole subtree. The hard constraint is that `theme` must NOT be
 * added to `isHiddenEditorField` — that predicate gates both the render filter
 * and `stripHiddenFieldState`, so flagging it would strip the subtree.
 */
describe('theme form-state survival', () => {
    beforeEach(() => {
        mockBuildFormState.mockReset();
        mockGetFieldByPath.mockReset();
    });

    it('does not flag the theme group as a hidden editor field', () => {
        expect(isHiddenEditorField({ name: 'theme', type: 'group' })).toBe(false);
    });

    it('keeps every theme.* path in the built form state', async () => {
        const themeField = { name: 'theme', type: 'group' as const };
        mockBuildFormState.mockResolvedValue({
            state: {
                theme: { value: undefined, valid: true },
                'theme.colors.background': { value: '#fefefe', valid: true },
                'theme.productCard.ctaBg': { value: '#14110b', valid: true },
                'theme.colors.accents.0.type': { value: 'primary', valid: true },
            },
        });
        mockGetFieldByPath.mockReturnValue({ field: themeField });

        const result = await buildCmsFormState({
            collectionSlug: 'shops',
            data: {},
            docPermissions: {} as never,
            docPreferences: { fields: {} },
            req: { payload: { collections: { shops: { config: { flattenedFields: [themeField] } } } } } as never,
            schemaPath: 'shops',
        });

        expect(Object.keys(result.state).sort()).toEqual([
            'theme',
            'theme.colors.accents.0.type',
            'theme.colors.background',
            'theme.productCard.ctaBg',
        ]);
    });
});
