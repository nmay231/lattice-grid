import { createStyles, Divider, ScrollArea } from "@mantine/core";
import { useProxy } from "valtio/utils";
import { useSettings } from "../../state/puzzle";
import { CodeGroup } from "./ConstraintsGroup";
import { ControlsGroup } from "./ControlsGroup";
import { DebugGroup } from "./DebugGroup";
import { LayersGroup } from "./LayersGroup";
import { MainGroup } from "./MainGroup";
import { sidebarProxy, smallPageWidth } from "./sidebarProxy";
import { UtilityBar } from "./UtilityBar";

type Arg1 = { smallPageWidth: string; utilityBarHeight: string; opened: boolean };
const useStyles = createStyles((theme, { smallPageWidth, utilityBarHeight, opened }: Arg1) => ({
    container: {
        height: "100%",
        width: "calc(100svw - 3px)",
        marginLeft: opened ? "-0svw" : "-100svw",
        transition: "margin-left 0.4s",
        borderRight: "3px solid rgb(54, 50, 50)",
        position: "absolute",
        zIndex: 1,
        backgroundColor: "white",
        [`@media (min-width: ${smallPageWidth})`]: {
            width: "calc(30svw - 3px)",
            marginLeft: opened ? "-0svw" : "-30svw",
            position: "unset",
        },
    },
    sidebar: {
        height: `calc(100% - ${utilityBarHeight})`,
        overflowX: "hidden",
    },
}));

export const SideBar = () => {
    const { pageMode, debugging: debug } = useSettings();

    const { opened } = useProxy(sidebarProxy);
    const utilityBarHeight = "3rem";
    const { classes } = useStyles({ smallPageWidth, utilityBarHeight, opened });

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
