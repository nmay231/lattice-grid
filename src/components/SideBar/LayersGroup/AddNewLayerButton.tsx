import { useState } from "react";
import { usePuzzle } from "../../../atoms/puzzle";
import { availableLayers } from "../../../logic/layers";
import { blurActiveElement } from "../../../utils/DOMUtils";

const DEFAULT_VALUE = "Add New Layer";

export const AddNewLayerButton = () => {
    const puzzle = usePuzzle();
    const [layerType, setLayerType] = useState(DEFAULT_VALUE);

    const handleSelectChange = ((event) => {
        const value = event.target.value;
        if (value === DEFAULT_VALUE) {
            return;
        }
        const newId = puzzle.addLayer(availableLayers[value]);
        puzzle.renderChange({ type: "draw", layerIds: [newId] });
        setLayerType(value);
        // TODO: Accessibility might be an issue if we add a layer when the dropdown changes. Particularly when using arrow keys to select (not to mention possible issues with mobile)
        blurActiveElement();
    }) as React.ChangeEventHandler<HTMLSelectElement>;

    const layerIds = Object.keys(availableLayers).filter((id) => !availableLayers[id].ethereal);
    layerIds.sort();

    return (
        <select onChange={handleSelectChange} value={layerType}>
            <option value={DEFAULT_VALUE}>{DEFAULT_VALUE}</option>

            {layerIds.map((id) => (
                <option value={id} key={id}>
                    {id}
                </option>
            ))}
        </select>
    );
};
