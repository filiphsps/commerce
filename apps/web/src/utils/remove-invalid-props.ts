import isPropValid from '@emotion/is-prop-valid';

export const RemoveInvalidProps = <T extends Record<string, any>>(props: T): Partial<T> => {
    let res: Partial<T> = {};

    for (const [key, value] of Object.entries(props)) {
        if (!isPropValid(key)) continue;

        res[key as keyof T] = value;
    }

    return res;
};
