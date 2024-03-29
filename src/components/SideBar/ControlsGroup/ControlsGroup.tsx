import { Checkbox } from "@mantine/core";
import React from "react";
import { useProxy } from "valtio/utils";
import { mobileControlsProxy } from "../../MobileControls";
import { Group } from "../Group";
import { LayerControlSettings } from "./LayerControlSettings";

export const ControlsGroup = React.memo(function ControlsGroup() {
    const mobileControls = useProxy(mobileControlsProxy);

    return (
        <Group name="Controls" expanded>
            <Checkbox
                label="Enable mobile controls"
                checked={mobileControls.enabled}
                onChange={() => (mobileControls.enabled = !mobileControls.enabled)}
                m="sm"
            />
            <LayerControlSettings />
        </Group>
    );
});
