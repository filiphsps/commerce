import { MissingEnvironmentVariableError } from '@nordcom/commerce-errors';

export function getServiceDomain(): string {
    const domain = process.env.SERVICE_DOMAIN;
    if (!domain) {
        throw new MissingEnvironmentVariableError('SERVICE_DOMAIN');
    }
    return domain;
}

export function getServiceUrl(): string {
    return `https://${getServiceDomain()}`;
}

export function getAdminHostname(): string {
    return `admin.${getServiceDomain()}`;
}
