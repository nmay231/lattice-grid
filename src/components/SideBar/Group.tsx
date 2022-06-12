import { useState } from "react";
import styling from "./Group.module.css";

type GroupProps = {
    children: React.ReactNode;
    name: string;
    expanded?: boolean;
};

export const Group: React.FC<GroupProps> = ({
    children,
    name,
    expanded = false,
}) => {
    const [expand, setExpand] = useState(expanded);
    return (
        <div className={styling.groupContainer}>
            <div
                className={styling.groupHeader}
                onClick={() => setExpand(!expand)}
            >
                <p>{name}</p>
            </div>
            <div
                className={
                    expand ? styling.groupBodyShown : styling.groupBodyHidden
                }
            >
                {children}
            </div>
        </div>
    );
};
