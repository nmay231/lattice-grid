import { Paper } from "@mantine/core";
import { useState } from "react";
import { IoIosArrowForward } from "react-icons/io";
import styling from "./Group.module.css";

type GroupProps = {
    children: React.ReactNode;
    name: string;
    expanded?: boolean;
};

export const Group: React.FC<GroupProps> = ({ children, name, expanded = false }) => {
    const [expand, setExpand] = useState(expanded);

    return (
        <Paper className={styling.groupContainer}>
            <div className={styling.groupHeader} onClick={() => setExpand(!expand)}>
                <IoIosArrowForward
                    className={expand ? styling.headerIconOpen : styling.headerIcon}
                />
                <p>{name}</p>
            </div>
            <div className={expand ? styling.groupBodyShown : styling.groupBodyHidden}>
                {children}
            </div>
        </Paper>
    );
};
