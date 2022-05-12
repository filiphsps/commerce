import React, { FunctionComponent, memo, useEffect, useState } from 'react';

import { FiX } from 'react-icons/fi';
import Input from '../Input';
import { useRouter } from 'next/router';
import { useStore } from 'react-context-hook';

interface SearchBarProps {}
const SearchBar: FunctionComponent<SearchBarProps> = (props) => {
    const [search, setSearch] = useStore<any>('search');
    const router = useRouter();

    useEffect(() => {
        setSearch({ ...search, open: false });
    }, [router.asPath]);

    return (
        <div className="SearchBar">
            <Input
                type={'text'}
                placeholder={'Search...'}
                value={search?.phrase}
                onClick={() => setSearch({ ...search, open: true })}
                onChange={(e) =>
                    setSearch({ ...search, phrase: e?.target?.value || '' })
                }
                onFocus={() => setSearch({ ...search, open: true })}
                spellCheck={false}
            />
            {(search?.phrase && search?.open && (
                <div
                    className="SearchBar-Cross"
                    onClick={() =>
                        setSearch({
                            open: false,
                            phrase: ''
                        })
                    }
                >
                    <FiX className="Icon" />
                </div>
            )) ||
                null}
        </div>
    );
};

export default memo(SearchBar);
