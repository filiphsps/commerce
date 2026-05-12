// Resolves the hostnames used by the admin dashboard and the marketing/landing site.
// Both are configured via env vars and fall back to the local dev ports declared in
// CLAUDE.md (admin: 3000, landing: 3001), so the app still boots when the vars are
// missing in dev or preview environments.
const ADMIN_HOSTNAME = process.env.ADMIN_DOMAIN || 'localhost:3000';
const LANDING_HOSTNAME = process.env.LANDING_DOMAIN || 'localhost:3001';

const protocolFor = (hostname: string) => (hostname.startsWith('localhost') ? 'http' : 'https');

export const ADMIN_DOMAIN = ADMIN_HOSTNAME;
export const LANDING_DOMAIN = LANDING_HOSTNAME;
export const ADMIN_URL = `${protocolFor(ADMIN_HOSTNAME)}://${ADMIN_HOSTNAME}`;
export const LANDING_URL = `${protocolFor(LANDING_HOSTNAME)}://${LANDING_HOSTNAME}`;
