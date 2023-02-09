import { createStyles, Divider, ScrollArea } from "@mantine/core";
import { proxy, useSnapshot } from "valtio";
import { useSettings } from "../../state/puzzle";
import { CodeGroup } from "./ConstraintsGroup";
import { ControlsGroup } from "./ControlsGroup";
import { DebugGroup } from "./DebugGroup";
import { LayersGroup } from "./LayersGroup";
import { MainGroup } from "./MainGroup";
import { UtilityBar } from "./UtilityBar";

export const sidebarProxy = proxy({ opened: true }); // TODO: Default should be based on screen size

type Arg1 = { utilityBarHeight: string; opened: boolean };
const useStyles = createStyles((theme, { utilityBarHeight, opened }: Arg1) => ({
    container: {
        height: "100%",
        width: "30svw",

        marginLeft: opened ? "-0svw" : "-30svw",
        transition: "margin-left 0.4s",

        borderRight: "3px solid rgb(54, 50, 50)",
        marginRight: "-3px",
    },
    sidebar: {
        height: `calc(100% - ${utilityBarHeight})`,
        overflowX: "hidden",
    },
}));

export const SideBar = () => {
    const { pageMode, debugging: debug } = useSettings();

    const { opened } = useSnapshot(sidebarProxy);
    const utilityBarHeight = "3rem";
    const { classes } = useStyles({ utilityBarHeight, opened });

    return (
        <div className={classes.container}>
            <UtilityBar height={utilityBarHeight} />
            <ScrollArea className={classes.sidebar} type="always" scrollbarSize={4}>
                <MainGroup />
                <LayersGroup />
                <ControlsGroup />
                {pageMode === "edit" && <CodeGroup />}
                {debug && <DebugGroup />}
                <Divider mb={20} /> {/* Show the user that there's nothing below. */}
            </ScrollArea>
        </div>
    );
};
