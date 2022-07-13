import { Paper } from "@mantine/core";
import { CodeGroup } from "./ConstraintsGroup";
import { ControlsGroup } from "./ControlsGroup";
import { LayersGroup } from "./LayersGroup";
import { MainGroup } from "./MainGroup";

export const SideBar: React.FC = () => {
    return (
        <Paper>
            <MainGroup />
            <LayersGroup />
            <ControlsGroup />
            <CodeGroup />
            <hr />
        </Paper>
    );
};
