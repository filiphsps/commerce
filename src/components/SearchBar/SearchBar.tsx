import React, { FunctionComponent, memo, useState } from 'react';

import { FiX } from 'react-icons/fi';
import Input from '../Input';
import { useStore } from 'react-context-hook';

interface SearchBarProps {}
const SearchBar: FunctionComponent<SearchBarProps> = (props) => {
    const [search, setSearch] = useStore<any>('search');

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
