import React, { FunctionComponent, memo } from 'react';

interface SectionHeaderProps {
    data?: {
        title?: any;
        subtitle?: any;
    };
}
const SectionHeader: FunctionComponent<SectionHeaderProps> = (props) => {
    const { data } = props;

    return (
        <div className="Slice Slice-SectionHeader">
            <div className="Slice-SectionHeader-Title">{data?.title}</div>
            {data?.subtitle && (
                <div className="Slice-SectionHeader-Subtitle">
                    {data?.subtitle}
                </div>
            )}
        </div>
    );
};

export default memo(SectionHeader);
