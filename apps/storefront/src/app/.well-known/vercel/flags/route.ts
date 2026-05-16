/* c8 ignore start */
import { createFlagsDiscoveryEndpoint, getProviderData } from 'flags/next';
import * as flags from '@/utils/flags';

export const GET = createFlagsDiscoveryEndpoint(async () => getProviderData(flags));
/* c8 ignore stop */
