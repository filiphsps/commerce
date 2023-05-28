export const StoreToken = async (token) => {
    localStorage.setItem(
        'access_token',
        JSON.stringify({
            accessToken: token.accessToken,
            expiresAt: token.expiresAt
        })
    );
};

export const GetToken = () => {
    return new Promise((resolve, reject) => {
        const data = localStorage.getItem('access_token');
        if (!data) return reject();

        const token = JSON.parse(data);

        return resolve(token);
    });
};
export const RemoveToken = () => {
    return new Promise((resolve) => {
        //const data = localStorage.removeItem('access_token');
        resolve(null);
    });
};
