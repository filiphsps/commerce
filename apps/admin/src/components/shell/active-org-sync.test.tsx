import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockUseAuth, mockUseOrganizationList, mockRefresh, setActive } = vi.hoisted(() => ({
    mockUseAuth: vi.fn(),
    mockUseOrganizationList: vi.fn(),
    mockRefresh: vi.fn(),
    setActive: vi.fn(),
}));

vi.mock('@clerk/nextjs', () => ({
    useAuth: mockUseAuth,
    useOrganizationList: mockUseOrganizationList,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mockRefresh }) }));

import { ActiveOrgSync } from './active-org-sync';

/** Wires the two Clerk hooks for one render: the session's active org, the loaded flags, and the operator's memberships. */
function arrange({
    orgId = null,
    authLoaded = true,
    listLoaded = true,
    memberOrgIds = [] as string[],
}: {
    orgId?: string | null;
    authLoaded?: boolean;
    listLoaded?: boolean;
    memberOrgIds?: string[];
} = {}) {
    mockUseAuth.mockReturnValue({ isLoaded: authLoaded, orgId });
    mockUseOrganizationList.mockReturnValue({
        isLoaded: listLoaded,
        setActive,
        userMemberships: { data: memberOrgIds.map((id) => ({ organization: { id } })) },
    });
}

describe('ActiveOrgSync', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(() => vi.resetAllMocks());

    it('switches to the routed org when the operator is a member and it is not already active', async () => {
        setActive.mockResolvedValue(undefined);
        arrange({ orgId: 'org_other', memberOrgIds: ['org_shop', 'org_other'] });

        await act(async () => {
            render(<ActiveOrgSync clerkOrgId="org_shop" />);
        });

        expect(setActive).toHaveBeenCalledWith({ organization: 'org_shop' });
        expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('does NOT switch to an org the operator is not a member of (the "given organization cannot be found" case)', async () => {
        arrange({ orgId: null, memberOrgIds: ['org_other'] });

        await act(async () => {
            render(<ActiveOrgSync clerkOrgId="org_unresolvable" />);
        });

        expect(setActive).not.toHaveBeenCalled();
        expect(mockRefresh).not.toHaveBeenCalled();
    });

    it('skips when the org is already active', async () => {
        arrange({ orgId: 'org_shop', memberOrgIds: ['org_shop'] });

        await act(async () => {
            render(<ActiveOrgSync clerkOrgId="org_shop" />);
        });

        expect(setActive).not.toHaveBeenCalled();
    });

    it('skips when the shop carries no clerkOrgId', async () => {
        arrange({ orgId: null, memberOrgIds: ['org_shop'] });

        await act(async () => {
            render(<ActiveOrgSync clerkOrgId={null} />);
        });

        expect(setActive).not.toHaveBeenCalled();
    });

    it('does not retry a target whose switch rejected (no refresh storm)', async () => {
        setActive.mockRejectedValue(new Error('given organization cannot be found'));
        arrange({ orgId: 'org_other', memberOrgIds: ['org_shop', 'org_other'] });

        const { rerender } = render(<ActiveOrgSync clerkOrgId="org_shop" />);
        await act(async () => {
            rerender(<ActiveOrgSync clerkOrgId="org_shop" />);
        });

        // One doomed attempt at most, never a refresh — re-renders must not re-fire the switch.
        expect(setActive).toHaveBeenCalledTimes(1);
        expect(mockRefresh).not.toHaveBeenCalled();
    });
});
