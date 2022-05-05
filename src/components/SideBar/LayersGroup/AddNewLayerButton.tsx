import { usePuzzle } from "../../../atoms/puzzle";
import { availableLayers } from "../../../logic/layers";

const DEFAULT_VALUE = "Add New Layer";

export const AddNewLayerButton = () => {
    const puzzle = usePuzzle();

    const handleSelectChange: React.ChangeEventHandler<HTMLSelectElement> = (
        event,
    ) => {
        // if (event.target.value === DEFAULT_VALUE) {
        //     return;
        // }
        // const asdf = 1;
        // puzzle.addLayer(availableLayers[data.layerType], data[data.layerType]);
        // puzzle.redrawScreen();
        //
    };

    const layerIds = Object.keys(availableLayers);
    layerIds.sort();

    return (
        <select onChange={handleSelectChange}>
            {/* <option value={DEFAULT_VALUE}>{DEFAULT_VALUE}</option>
            {layerIds.map((id) => (
                <option value={id} key={id}>
                    {id}
                </option>
            ))} */}
        </select>
    );
};
