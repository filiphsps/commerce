import React, { FunctionComponent, useState } from 'react';

interface DropdownListProps {
    items?: Array<any>;
    selected?: string;
    onChange?: any;
}
const DropdownList: FunctionComponent<DropdownListProps> = (props) => {
    const [open, setOpen] = useState(false);

    if (!props?.items || props?.items?.length <= 1) return null;

    const selected =
        props?.selected || (props?.items && props?.items[0]?.value);
    return (
        <div
            className={`DropdownList ${open && 'DropdownList-Open'}`}
            onClick={() => setOpen(!open)}
        >
            {!open &&
                props?.items?.map((item) => {
                    if (item?.value !== selected) return null;

                    return (
                        <div key={item?.value} className={`DropdownList-Item`}>
                            <div className="DropdownList-Item-Icon">
                                {item?.icon}
                            </div>
                            <div className="DropdownList-Item-Title">
                                {item?.title || item?.value}
                            </div>
                        </div>
                    );
                })}

            {props?.items?.map((item) => {
                return (
                    <div
                        key={item?.value}
                        className={`DropdownList-Item ${
                            item?.value === selected &&
                            'DropdownList-Item-Selected'
                        }`}
                        onClick={() => {
                            if (!open) return;

                            if (props?.onChange) props?.onChange(item?.value);
                        }}
                    >
                        <div className="DropdownList-Item-Icon">
                            {item?.icon}
                        </div>
                        <div className="DropdownList-Item-Title">
                            {item?.title || item?.value}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default DropdownList;
