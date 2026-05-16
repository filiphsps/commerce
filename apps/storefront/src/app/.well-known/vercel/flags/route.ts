import { createFlagsDiscoveryEndpoint, getProviderData } from 'flags/next';
import * as flags from '@/utils/flags';

export const GET = createFlagsDiscoveryEndpoint(async () => getProviderData(flags));
