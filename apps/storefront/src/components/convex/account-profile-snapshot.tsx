import Image from 'next/image';
import { Label } from '@/components/typography/label';
import type { AccountProfileSnapshot } from './account-profile-contract';

/**
 * Read-only presentational rendering of the account profile, shared by every
 * branch of the SFREAD-08 island so all of them paint the same markup: the
 * server-rendered snapshot (kill switch / no token), the live island's first
 * paint and upgrades (`usePreloadedQuery` feeds this same view), and the
 * degraded fallbacks (socket down, auth failure, chunk-load failure). Pure and
 * convex-free, so it renders on the server and inside client fallbacks without
 * pulling any Convex bytes into either bundle.
 *
 * @param props.profile - The profile slice to render (session snapshot or live query result).
 * @param props.live - Whether the values come from the live Convex subscription path; surfaced as `data-live` for tests and styling, defaults to `false` (snapshot).
 * @returns The profile fields, with the avatar omitted when no image is set.
 */
export function AccountProfileSnapshotView({
    profile,
    live = false,
}: {
    profile: AccountProfileSnapshot;
    live?: boolean;
}) {
    return (
        <div data-testid="account-profile" data-live={live ? 'true' : 'false'}>
            <Label as="div">{profile.id}</Label>
            <Label as="div">{profile.name}</Label>
            <Label as="div">{profile.email}</Label>
            {profile.image ? (
                <Image
                    src={profile.image}
                    alt={profile.name || ''}
                    height={100}
                    width={100}
                    className="rounded-full object-cover object-center"
                />
            ) : null}
        </div>
    );
}
