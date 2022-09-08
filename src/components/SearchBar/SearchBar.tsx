import React, { FunctionComponent, memo } from 'react';

import { FiX } from 'react-icons/fi';
import { useRouter } from 'next/router';
import { useStore } from 'react-context-hook';

interface SearchBarProps {}
const SearchBar: FunctionComponent<SearchBarProps> = () => {
    const [search, setSearch] = useStore<any>('search');
    const router = useRouter();

    return (
        <div className="SearchBar">
            <input
                className="Input data-hj-allow"
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
