import { createStyles, Divider, ScrollArea } from "@mantine/core";
import { useSettings } from "../../state/puzzle";
import { CodeGroup } from "./ConstraintsGroup";
import { ControlsGroup } from "./ControlsGroup";
import { DebugGroup } from "./DebugGroup";
import { LayersGroup } from "./LayersGroup";
import { MainGroup } from "./MainGroup";
import { UtilityBar } from "./UtilityBar";

// type Arg1 = { smallPageWidth: string; utilityBarHeight: string; opened: boolean };
const useStyles = createStyles((theme, { gridArea }: { gridArea: string }) => ({
    // container: {
    //     height: "100%",
    //     width: "100svw",
    //     marginLeft: opened ? "-0svw" : "-100svw",
    //     transition: "margin-left 0.4s",
    //     borderRight: "3px solid rgb(54, 50, 50)",
    //     position: "absolute",
    //     zIndex: 10, // Mobile controls buttons can show otherwise
    //     backgroundColor: "white",
    //     [`@media (min-width: ${smallPageWidth})`]: {
    //         width: "30svw",
    //         marginLeft: opened ? "-0svw" : "-30svw",
    //         position: "unset",
    //     },
    // },
    sidebar: {
        // height: `calc(100% - ${utilityBarHeight})`,
        gridArea,
        transition: "grid-area 400ms",
        overflowX: "hidden",
    },
}));

export const SideBarMain = ({ gridArea }: { gridArea: string }) => {
    const { pageMode, debugging: debug } = useSettings();

    // const { opened } = useProxy(sidebarProxy);
    // const utilityBarHeight = "3rem";
    const { classes } = useStyles({ gridArea });

    return (
        <ScrollArea className={classes.sidebar} type="always" scrollbarSize={4}>
            <MainGroup />
            <LayersGroup />
            <ControlsGroup />
            {pageMode === "edit" && <CodeGroup />}
            {debug && <DebugGroup />}
            <Divider mb={20} /> {/* Show the user that there's nothing below. */}
        </ScrollArea>
    );
};

export const SideBarUtilityBar = UtilityBar;
