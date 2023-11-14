import type { CommerceError } from '@/utils/errors';
import { getErrorFromStatusCode } from '@/utils/errors';
import { useEffect, useState } from 'react';

export const api = 'https://api.country.is';

export type useCountryResult = {
    code: string | undefined;
    error: CommerceError | undefined;
    isLoading: boolean;
};
export const useCountry = (): useCountryResult => {
    const [country, setCountry] = useState<useCountryResult['code']>();
    const [error, setError] = useState<useCountryResult['error']>();
    const [isLoading, setIsLoading] = useState<useCountryResult['isLoading']>(true);

    useEffect(() => {
        let isCancelled = false;
        if (country) return () => {};

        async function fetchAPI() {
            setIsLoading(() => true);
            await fetch(api)
                .then((res) => {
                    if (!res.ok) {
                        throw getErrorFromStatusCode(res.status);
                    }

                    setError(() => undefined);
                    return res.json();
                })
                .then((res) => {
                    if (res && res.country && !isCancelled) setCountry(() => res.country);
                })
                .catch((err) => setError(() => err))
                .finally(() => setIsLoading(() => false));
        }

        fetchAPI();
        return () => {
            isCancelled = true;
        };
    }, []);

    return { code: country, error, isLoading };
};
