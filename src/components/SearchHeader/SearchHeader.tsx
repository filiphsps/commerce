import React, { FunctionComponent } from 'react';

import CollectionBlock from '../CollectionBlock';
import PageLoader from '../PageLoader';
import { SearchApi } from '../../api/search';
import useSWR from 'swr';

interface SearchHeaderProps {
    query?: string;
    country?: string;
}
const SearchHeader: FunctionComponent<SearchHeaderProps> = (props) => {
    const {
        data,
        error
    }: {
        data?: any;
        error?: any;
    } = useSWR(props?.query ? [`${props?.query}`] : null, (url) =>
        SearchApi(url)
    );

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
                {data.length ? (
                    <CollectionBlock
                        hideTitle
                        search
                        data={{
                            items: data.map((item) => item.handle) || []
                        }}
                        isHorizontal
                    />
                ) : (
                    ''
                )}
            </div>
        </div>
    );
};

export default SearchHeader;
