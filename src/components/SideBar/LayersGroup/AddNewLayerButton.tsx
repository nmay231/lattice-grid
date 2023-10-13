import { Select } from "@mantine/core";
import { useState } from "react";
import { availableLayers } from "../../../layers";
import { usePuzzle, useSettings } from "../../../state/puzzle";
import { useFocusElementHandler } from "../../../utils/focusManagement";
import { smartSort } from "../../../utils/string";

const DEFAULT_VALUE = "Add New Layer";

export const AddNewLayerButton = () => {
    const puzzle = usePuzzle();
    const { debugging } = useSettings();
    const [layerType, setLayerType] = useState(DEFAULT_VALUE);
    const { ref, unfocus } = useFocusElementHandler();

    const handleSelectChange = (value: string) => {
        if (value === DEFAULT_VALUE) {
            return;
        }
        const newId = puzzle.addLayer(availableLayers[value as keyof typeof availableLayers], null);
        puzzle.renderChange({ type: "draw", layerIds: [newId] });
        setLayerType(DEFAULT_VALUE);
        unfocus();
    };

    const nonEthereal = Object.values(availableLayers)
        .filter(({ ethereal }) => debugging || !ethereal)
        .sort((a, b) => smartSort(a.displayName, b.displayName))
        .map(({ type, displayName }) => ({ label: displayName, value: type as string }));
    nonEthereal.unshift({ value: DEFAULT_VALUE, label: DEFAULT_VALUE });

    return (
        <Select
            ref={ref}
            tabIndex={0}
            m="sm"
            onChange={handleSelectChange}
            value={layerType}
            data={nonEthereal}
        />
    );
};
