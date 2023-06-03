import { useEffect, useState } from 'react';

const useCountry = () => {
    const [country, setCountry] = useState();
    const [error, setError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const api = 'https://api.country.is';

    useEffect(() => {
        let isCancelled = false;
        if (country) return () => {};

        async function fetchAPI() {
            setIsLoading(true);
            await fetch(api)
                .then((res) => {
                    if (!res.ok) {
                        throw new Error(res.statusText);
                    }
                    return res.json();
                })
                .then((res) => {
                    if (res && res.country && !isCancelled) setCountry(res.country);
                })
                .catch((err) => setError(err))
                .finally(() => setIsLoading(false));
        }
        fetchAPI();
        return () => {
            isCancelled = true;
        };
    }, []);

    return { code: country, error, isLoading };
};

export default useCountry;
