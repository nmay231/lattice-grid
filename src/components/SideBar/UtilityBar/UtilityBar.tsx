import { ActionIcon, createStyles, Tooltip } from "@mantine/core";
import { IoMdArrowRoundBack, IoMdArrowRoundForward, IoMdSettings } from "react-icons/io";
import { useProxy } from "valtio/utils";
import { useFocusElementHandler } from "../../../utils/focusManagement";
import { sidebarProxy } from "../sidebarProxy";

const useStyles = createStyles((theme, { height }: { height: string }) => ({
    container: {
        height: `calc(${height} - 3px)`,
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "end",
        padding: "6px",

        borderBottom: "3px solid rgb(54, 50, 50)",
    },
    icon: {
        margin: "8px",
    },
    offsetIcon: {
        right: "-60px",
        zIndex: 1,
    },
}));

export const UtilityBar = ({ height }: { height: string }) => {
    const sidebar = useProxy(sidebarProxy);
    const { classes, cx } = useStyles({ height });
    const { ref: openToggleRef } = useFocusElementHandler();

    return (
        <div className={classes.container}>
            <Tooltip label="Settings (Todo)" events={{ hover: true, focus: true, touch: true }}>
                <ActionIcon
                    size="lg"
                    className={classes.icon}
                    variant="filled"
                    color="gray"
                    // tabIndex={-1}
                >
                    <IoMdSettings />
                </ActionIcon>
            </Tooltip>
            <Tooltip label="Toggle Sidebar" events={{ hover: true, focus: true, touch: true }}>
                <ActionIcon
                    ref={openToggleRef}
                    size="lg"
                    className={cx(classes.icon, !sidebar.opened && classes.offsetIcon)}
                    variant="filled"
                    color="blue"
                    tabIndex={-1}
                    onClick={() => (sidebar.opened = !sidebar.opened)}
                >
                    {sidebar.opened ? <IoMdArrowRoundBack /> : <IoMdArrowRoundForward />}
                </ActionIcon>
            </Tooltip>
        </div>
    );
};
