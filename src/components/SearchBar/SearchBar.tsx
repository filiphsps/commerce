import React, { FunctionComponent, memo, useEffect, useRef } from 'react';
import styled, { css } from 'styled-components';

import { FiX } from 'react-icons/fi';
import { useStore } from 'react-context-hook';

const Container = styled.div<{ open?: boolean }>`
    overflow: hidden;

    @media (max-width: 950px) {
        position: absolute;
        min-width: 100%;
        width: 100%;
        left: 0px;
        bottom: -5rem;
        padding: 1rem;
        background: var(--color-text-primary);
        transition: 250ms ease-in-out;
        pointer-events: none;
        opacity: 0;

        ${({ open }) =>
            open &&
            css`
                pointer-events: initial;
                opacity: 1;
            `}
    }
`;

interface SearchBarProps {
    open?: boolean;
}
const SearchBar: FunctionComponent<SearchBarProps> = ({ open }) => {
    const [search, setSearch] = useStore<any>('search');

    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    return (
        <Container className="SearchBar" open={open}>
            <input
                ref={inputRef}
                className="Input data-hj-allow"
                type={'text'}
                placeholder={'Search...'}
                value={search?.phrase}
                onClick={() => setSearch({ ...search, open: true })}
                onChange={(e) => setSearch({ ...search, phrase: e?.target?.value || '' })}
                onFocus={() => setSearch({ ...search, open: true })}
                spellCheck={false}
            />
            {search?.phrase && search?.open && (
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
            )}
        </Container>
    );
};

export default memo(SearchBar);
