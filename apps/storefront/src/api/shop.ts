import 'server-only';

import { MissingEnvironmentVariableError } from '@nordcom/commerce-errors';

export type HexColor = `#${string}`;
export type Color = HexColor;

export type Image = {
    src: string;
    width: number;
    height: number;
    alt: string;
    copyright?: string;
};

export function getGlobalServiceDomain() {
    const token = process.env.SERVICE_DOMAIN;
    if (!token) {
        throw new MissingEnvironmentVariableError('SERVICE_DOMAIN');
    }

    return token;
}
