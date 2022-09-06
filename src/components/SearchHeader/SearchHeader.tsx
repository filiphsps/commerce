import React, { FunctionComponent, useEffect, useState } from 'react';

import CollectionBlock from '../CollectionBlock';
import PageLoader from '../PageLoader';
import { SearchApi } from '../../api/search';
import useSWR from 'swr';

interface SearchHeaderProps {
    query?: string;
    country?: string;
}
const SearchHeader: FunctionComponent<SearchHeaderProps> = (props) => {
    const { data } = useSWR(props?.query ? [`${props?.query}`] : null, (url) =>
        SearchApi(url)
    );

    const [items, setItems] = useState([]);
    useEffect(() => {
        if (!data || data?.length <= 0) return;

        setItems(data);
    }, [data]);

    if (!props.query) return null;
    else if (!data)
        return (
            <div className="SearchHeader">
                <PageLoader />
            </div>
        );

    return (
        <div className="SearchHeader">
            <div className="SearchHeader-Content">
                {items.length ? (
                    <CollectionBlock
                        hideTitle
                        search
                        data={{
                            items
                        }}
                        isHorizontal
                    />
                ) : null}
            </div>
        </div>
    );
};

export default SearchHeader;
