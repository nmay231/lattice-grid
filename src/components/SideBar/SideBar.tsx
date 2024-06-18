import { Divider, ScrollArea } from "@mantine/core";
import React from "react";
import { useSettings } from "../../state/puzzle";
import { ControlsGroup } from "./ControlsGroup";
import { DebugGroup } from "./DebugGroup";
import { LayersGroup } from "./LayersGroup";
import { MainGroup } from "./MainGroup";
import styles from "./SideBar.module.css";

export { UtilityBar as SideBarUtilityBar } from "./UtilityBar";

export const SideBar = React.memo(function SideBar() {
    const { debugging } = useSettings();

    return (
        <ScrollArea className={styles.sidebar} type="always" scrollbarSize={4}>
            <MainGroup />
            <LayersGroup />
            <ControlsGroup />
            {debugging && <DebugGroup />}
            <Divider mb={20} /> {/* Show the user that there's nothing below. */}
        </ScrollArea>
    );
});
