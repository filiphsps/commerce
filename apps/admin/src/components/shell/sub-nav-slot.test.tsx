import { describe, expect, it } from 'vitest';
import { InspectorSlot } from '@/components/shell/inspector-slot';
import { SubNavSlot } from '@/components/shell/sub-nav-slot';
import { render, screen } from '@/utils/test/react';

describe('SubNavSlot / InspectorSlot', () => {
    it('SubNavSlot renders children inside a scrollable region', () => {
        render(
            <SubNavSlot>
                <span>nav child</span>
            </SubNavSlot>,
        );
        expect(screen.getByText('nav child')).toBeInTheDocument();
    });

    it('InspectorSlot renders children inside a scrollable region', () => {
        render(
            <InspectorSlot>
                <span>inspector child</span>
            </InspectorSlot>,
        );
        expect(screen.getByText('inspector child')).toBeInTheDocument();
    });
});
