import { Divider, Paper } from "@mantine/core";
import { useSettings } from "../../state/puzzle";
import { CodeGroup } from "./ConstraintsGroup";
import { ControlsGroup } from "./ControlsGroup";
import { DebugGroup } from "./DebugGroup";
import { LayersGroup } from "./LayersGroup";
import { MainGroup } from "./MainGroup";

export const SideBar: React.FC = () => {
    const { pageMode, debugging: debug } = useSettings();

    return (
        <Paper>
            <MainGroup />
            <LayersGroup />
            <ControlsGroup />
            {pageMode === "edit" && <CodeGroup />}
            {debug && <DebugGroup />}
            <Divider mb={20} /> {/* Show the user that there's nothing below. */}
        </Paper>
    );
};
