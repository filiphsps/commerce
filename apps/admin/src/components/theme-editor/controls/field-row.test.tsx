import type { ThemeTokenMeta } from '@nordcom/commerce-db/lib/theme-catalog';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@/utils/test/react';
import { DimensionControl } from './dimension-control';
import { errorTextId, FieldRow, hintTextId } from './field-row';

const token = (overrides: Partial<ThemeTokenMeta> = {}): ThemeTokenMeta =>
    ({
        group: 'colors',
        cluster: 'brand',
        path: 'theme.colors.brand',
        cssVar: '--brand',
        valueKind: 'color',
        payloadType: 'text',
        ...overrides,
    }) as ThemeTokenMeta;

describe('FieldRow a11y', () => {
    it('announces the validation error and ids it for aria-describedby', () => {
        render(
            <FieldRow token={token()} htmlFor="theme.colors.brand" onReset={() => {}} showError>
                <input id="theme.colors.brand" />
            </FieldRow>,
        );
        const error = screen.getByRole('alert');
        expect(error.id).toBe(errorTextId('theme.colors.brand'));
    });

    it('ids the quoted hint for aria-describedby', () => {
        render(
            <FieldRow token={token({ quoted: true })} htmlFor="theme.colors.brand" onReset={() => {}}>
                <input id="theme.colors.brand" />
            </FieldRow>,
        );
        expect(document.getElementById(hintTextId('theme.colors.brand'))).not.toBeNull();
    });
});

describe('control a11y wiring', () => {
    it('marks the input invalid and links the describing copy', () => {
        render(
            <DimensionControl
                token={token({ valueKind: 'dimension' })}
                value="oops"
                onChange={() => {}}
                id="theme.colors.brand"
                invalid
                describedBy={errorTextId('theme.colors.brand')}
            />,
        );
        const input = screen.getByRole('textbox');
        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(input).toHaveAttribute('aria-describedby', errorTextId('theme.colors.brand'));
    });
});
