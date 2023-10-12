import { Divider, ScrollArea } from "@mantine/core";
import { useSettings } from "../../state/puzzle";
import { CodeGroup } from "./ConstraintsGroup";
import { ControlsGroup } from "./ControlsGroup";
import { DebugGroup } from "./DebugGroup";
import { LayersGroup } from "./LayersGroup";
import { MainGroup } from "./MainGroup";
import styles from "./SideBar.module.css";
import { UtilityBar } from "./UtilityBar";

export const SideBar = () => {
    const { pageMode, debugging: debug } = useSettings();

    return (
        <ScrollArea className={styles.sidebar} type="always" scrollbarSize={4}>
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
