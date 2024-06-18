import { Divider, ScrollArea } from "@mantine/core";
import React from "react";
import { useProxy } from "valtio/utils";
import { PuzzleManager } from "../../PuzzleManager";
import { ControlsGroup } from "./ControlsGroup";
import { DebugGroup } from "./DebugGroup";
import { LayersGroup } from "./LayersGroup";
import { MainGroup } from "./MainGroup";
import styles from "./SideBar.module.css";

export { UtilityBar as SideBarUtilityBar } from "./UtilityBar";

export const SideBar = React.memo(function SideBar({ puzzle }: { puzzle: PuzzleManager }) {
    const { debugging } = useProxy(puzzle.settings);

    return (
        <ScrollArea className={styles.sidebar} type="always" scrollbarSize={4}>
            <MainGroup puzzle={puzzle} />
            <LayersGroup puzzle={puzzle} />
            <ControlsGroup puzzle={puzzle} />
            {debugging && <DebugGroup puzzle={puzzle} />}
            <Divider mb={20} /> {/* Show the user that there's nothing below. */}
        </ScrollArea>
    );
});
