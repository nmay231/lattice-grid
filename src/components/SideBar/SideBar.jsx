import { ControlsGroup } from "./ControlsGroup";
import { LayersGroup } from "./LayersGroup";

export const SideBar = () => {
    return (
        <div>
            <LayersGroup />
            <ControlsGroup />
        </div>
    );
};
