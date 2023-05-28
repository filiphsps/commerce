import * as Prismic from '@prismicio/client';

import { Config } from '../util/Config';

export const apiEndpoint = Config.prismic.repo;
export const accessToken = '';

// Client method to query documents from the Prismic repo
export const prismic = (req = null) =>
    new Prismic.Client(apiEndpoint, createClientOptions(req, accessToken));

const createClientOptions = (
    req: any = null,
    prismicAccessToken: any = null
) => {
    const reqOption = req ? { req } : {};
    const accessTokenOption = prismicAccessToken
        ? { accessToken: prismicAccessToken }
        : {};
    return {
        ...reqOption,
        ...accessTokenOption
    };
};
