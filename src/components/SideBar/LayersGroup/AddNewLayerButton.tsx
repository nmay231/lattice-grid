import { Select } from "@mantine/core";
import { useState } from "react";
import { usePuzzle } from "../../../atoms/puzzle";
import { availableLayers } from "../../../logic/layers";
import { blurActiveElement } from "../../../utils/DOMUtils";

const DEFAULT_VALUE = "Add New Layer";

export const AddNewLayerButton = () => {
    const puzzle = usePuzzle();
    const [layerType, setLayerType] = useState(DEFAULT_VALUE);

    const handleSelectChange = (value: string) => {
        if (value === DEFAULT_VALUE) {
            return;
        }
        const newId = puzzle.addLayer(availableLayers[value]);
        puzzle.renderChange({ type: "draw", layerIds: [newId] });
        setLayerType(DEFAULT_VALUE);
        // TODO: Accessibility might be an issue if we add a layer when the dropdown changes. Particularly when using arrow keys to select (not to mention possible issues with mobile)
        blurActiveElement();
    };

    const layerIds = Object.keys(availableLayers).filter((id) => !availableLayers[id].ethereal);
    layerIds.sort();
    layerIds.unshift(DEFAULT_VALUE);

    return (
        <Select
            m="sm"
            withinPortal
            onChange={handleSelectChange}
            value={layerType}
            data={layerIds.map((id) => ({ value: id, label: id }))}
        />
    );
};
