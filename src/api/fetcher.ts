import { Config } from '../util/Config';
import axios from 'axios';

const NewFetcher = (url: string, params?: any, cacheDuration: number = 5 * 60 * 1000) => {
    return axios({
        ...{
            baseURL: Config.environment === 'development' ? 'http://localhost:3000/api/' : '/api/',
            withCredentials: true,
            method: 'GET',
            timeout: 5000,
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
    return axios({
        ...{
            baseURL: Config.environment === 'development' ? 'http://localhost:3000/api/' : '/api/',
            withCredentials: true,
            method: 'POST',
            timeout: 5000,
            data: body
        },
        url,
        params
    }).then((res) => res.data?.data);
};
const Post = post;

export { NewFetcher, Post, post };

export default NewFetcher;
