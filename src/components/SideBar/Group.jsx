import { useState } from "react";
import styling from "./Group.module.css";

export const Group = ({ children, name, expanded }) => {
    const [expand, setExpand] = useState(expanded);
    return (
        <div>
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
