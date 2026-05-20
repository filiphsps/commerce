export type { AppName, DevTld, Hostname, ParsedHost, ShopHandle } from './hostname';
export {
    appFromHost,
    DEV_TLDS,
    isDevHost,
    isLocalhost,
    normalizeHost,
    parseHost,
    portFromHost,
    shopFromHost,
    stripPort,
} from './hostname';
