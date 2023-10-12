import { Collapse, Paper, Text } from "@mantine/core";
import { useState } from "react";
import { IoIosArrowForward } from "react-icons/io";
import styles from "./SideBar.module.css";

type GroupProps = {
    children: React.ReactNode;
    name: string;
    expanded?: boolean;
};

export const Group: React.FC<GroupProps> = ({ children, name, expanded = false }) => {
    const [expand, setExpand] = useState(expanded);

    return (
        <Paper className={styles.groupContainer}>
            <div className={styles.groupHeader} onClick={() => setExpand(!expand)}>
                <IoIosArrowForward className={expand ? styles.headerIconOpen : styles.headerIcon} />
                <Text>{name}</Text>
            </div>
            <Collapse p={3} in={expand}>
                {children}
            </Collapse>
        </Paper>
    );
};
