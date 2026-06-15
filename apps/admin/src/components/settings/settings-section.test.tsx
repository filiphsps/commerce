import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SettingsSection } from './settings-section';

describe('SettingsSection', () => {
    it('renders the title, description, body, and footer', () => {
        const { getByText, getByTestId } = render(
            <SettingsSection title="Profile" description="Your details" footer={<span>foot</span>}>
                <div data-testid="body">body</div>
            </SettingsSection>,
        );
        expect(getByText('Profile')).toBeTruthy();
        expect(getByText('Your details')).toBeTruthy();
        expect(getByTestId('body')).toBeTruthy();
        expect(getByText('foot')).toBeTruthy();
    });
});
