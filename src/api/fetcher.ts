import axios from 'axios';

const getApplication = (params) => {
    return process.env.STORE || process.env.STORE;
};

const NewFetcher = (
    url: string,
    params?: any,
    cacheDuration: number = 5 * 60 * 1000
) => {
    const application = getApplication(params);

    return axios({
        ...{
            baseURL:
                process.env.NODE_ENV === 'development'
                    ? 'http://localhost:3000/api/'
                    : '/api/',
            withCredentials: true,
            method: 'GET',
            timeout: 5000,
            headers: {
                'X-Techhof-Store': application
            },
            cache: {
                maxAge: cacheDuration,
                exclude: {
                    query: false
                }
            }
        },
        url,
        params
    })
        .then((res) => res.data?.data)
        .catch((error) => error?.response?.data?.error);
};

const post = (url: string, params?: any, body?: any) => {
    const application = getApplication(params);

    return axios({
        ...{
            baseURL:
                process.env.NODE_ENV === 'development'
                    ? 'http://localhost:3000/api/'
                    : '/api/',
            withCredentials: true,
            method: 'POST',
            timeout: 5000,
            data: body,
            headers: {
                'X-Techhof-Store': application
            }
        },
        url,
        params
    }).then((res) => res.data?.data);
};
const Post = post;

export { NewFetcher, Post, post };

export default NewFetcher;
