import { LayersGroup } from "./LayersGroup";

export const SideBar = ({ puzzle }) => {
    return (
        <div>
            <LayersGroup puzzle={puzzle} />
        </div>
    );
};
