import { ControlsGroup } from "./ControlsGroup";
import { LayersGroup } from "./LayersGroup";
import { MainGroup } from "./MainGroup";

export const SideBar = () => {
    return (
        <div>
            <MainGroup />
            <LayersGroup />
            <ControlsGroup />
        </div>
    );
};
