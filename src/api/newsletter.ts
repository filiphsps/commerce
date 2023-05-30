export const NewsletterApi = async ({
    email
}: {
    email: string;
}): Promise<any> => {
    return new Promise(async (resolve, reject) => {
        try {
            const res = await fetch('/api/newsletter/subscribe', {
                method: 'post',
                headers: {
                    'content-type': 'text/plain'
                },
                body: JSON.stringify({
                    email
                })
            });

            const response = await res.json();
            if (res.status !== 200 && res.status !== 201) throw response;

            resolve(response);
        } catch (error) {
            console.error(error);
            reject(error);
        }
    });
};
