import { CodeGroup } from "./ConstraintsGroup";
import { ControlsGroup } from "./ControlsGroup";
import { LayersGroup } from "./LayersGroup";
import { MainGroup } from "./MainGroup";

export const SideBar: React.FC = () => {
    return (
        <div>
            <MainGroup />
            <LayersGroup />
            <ControlsGroup />
            <CodeGroup />
        </div>
    );
};
