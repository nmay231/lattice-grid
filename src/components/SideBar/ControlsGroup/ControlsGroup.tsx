import { Center, Checkbox } from "@mantine/core";
import React from "react";
import { useProxy } from "valtio/utils";
import { PuzzleManager } from "../../../PuzzleManager";
import { mobileControlsProxy } from "../../MobileControls";
import { Group } from "../Group";
import { PuzzleModeToggle } from "../MainGroup/PuzzleModeToggle";
import { LayerControlSettings } from "./LayerControlSettings";

export const ControlsGroup = React.memo(function ControlsGroup({
    puzzle,
}: {
    puzzle: PuzzleManager;
}) {
    const mobileControls = useProxy(mobileControlsProxy);
    const { pageMode } = useProxy(puzzle.settings);

    return (
        <Group name="Controls" expanded>
            <Checkbox
                label="Enable mobile controls"
                checked={mobileControls.enabled}
                onChange={() => (mobileControls.enabled = !mobileControls.enabled)}
                m="sm"
            />
            {pageMode === "edit" && (
                <Center mb="md">
                    <PuzzleModeToggle puzzle={puzzle} />
                </Center>
            )}

            <LayerControlSettings puzzle={puzzle} />
        </Group>
    );
});
