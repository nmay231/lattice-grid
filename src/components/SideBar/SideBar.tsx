import { ControlsGroup } from "./ControlsGroup";
import { LayersGroup } from "./LayersGroup";
import { MainGroup } from "./MainGroup";
import { CodeGroup } from "./TemporaryCodeGroup";

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
