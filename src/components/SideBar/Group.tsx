import { Collapse, createStyles, Paper, Text } from "@mantine/core";
import { useState } from "react";
import { IoIosArrowForward } from "react-icons/io";

const useStyles = createStyles((theme, { transitionDuration }: { transitionDuration: string }) => ({
    groupContainer: {
        marginBottom: "10px",
    },
    groupHeader: {
        display: "inline-flex",
        justifyContent: "center",
        padding: "7px",
        margin: "0px",
        backgroundColor: "gray",
        boxSizing: "border-box",
        width: "100%",
        textAlign: "center",
        fontSize: "20px",

        "& > *": {
            margin: "0px",
            padding: "0px",
            userSelect: "none",
        },
    },
    headerIcon: {
        transition: `transform ${transitionDuration}`,
        transform: "rotate(0deg)",
    },
    headerIconOpen: {
        transition: `transform ${transitionDuration}`,
        transform: "rotate(90deg)",
    },
}));

type GroupProps = {
    children: React.ReactNode;
    name: string;
    expanded?: boolean;
};

export const Group: React.FC<GroupProps> = ({ children, name, expanded = false }) => {
    const { classes } = useStyles({ transitionDuration: "200ms" });
    const [expand, setExpand] = useState(expanded);

    return (
        <Paper className={classes.groupContainer}>
            <div className={classes.groupHeader} onClick={() => setExpand(!expand)}>
                <IoIosArrowForward
                    className={expand ? classes.headerIconOpen : classes.headerIcon}
                />
                <Text>{name}</Text>
            </div>
            <Collapse p={3} in={expand}>
                {children}
            </Collapse>
        </Paper>
    );
};
