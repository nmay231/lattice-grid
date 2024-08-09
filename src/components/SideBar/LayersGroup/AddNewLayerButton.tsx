import { Select } from "@mantine/core";
import { useCallback, useMemo, useState } from "react";
import { useProxy } from "valtio/utils";
import { PuzzleManager } from "../../../PuzzleManager";
import { type AvailableLayerType } from "../../../layers";
import { useFocusElementHandler } from "../../../utils/focusManagement";
import { smartSort } from "../../../utils/string";

const DEFAULT_VALUE = "Add New Layer";

export const AddNewLayerButton = ({ puzzle }: { puzzle: PuzzleManager }) => {
    const { debugging } = useProxy(puzzle.settings);
    const [layerType, setLayerType] = useState(DEFAULT_VALUE);
    const { ref, unfocus } = useFocusElementHandler();

    const handleSelectChange = useCallback(
        (value: string | null) => {
            if (!value || value === DEFAULT_VALUE) {
                return;
            }
            const newId = puzzle.addLayer(
                puzzle.availableLayers[value as AvailableLayerType],
                null,
            );

            // TODO: Temporary (TM) solution to put background colors in the background.
            // TODO: Should remove after I get layer renderOrder figured out
            if (value === ("BackgroundColorLayer" satisfies AvailableLayerType)) {
                const bottom = puzzle.layers.getFirstSelectableKey();
                if (bottom && bottom !== newId) {
                    puzzle.shuffleLayerOnto(newId, bottom);
                }
            }

            puzzle.renderChange({ type: "draw", layerIds: [newId] });
            // TODO: Mantine has a bug where the displayed value doesn't update even though the state does
            setLayerType(DEFAULT_VALUE);
            unfocus();
        },
        [puzzle, unfocus],
    );

    const nonEthereal = useMemo(() => {
        const arr = Object.values(puzzle.availableLayers)
            .filter(({ ethereal }) => debugging || !ethereal)
            .sort((a, b) => smartSort(a.displayName, b.displayName))
            .map(({ type, displayName }) => ({ label: displayName, value: type }));
        arr.unshift({ value: DEFAULT_VALUE, label: DEFAULT_VALUE });
        return arr;
    }, [debugging, puzzle.availableLayers]);

    return (
        <Select
            ref={ref}
            tabIndex={0}
            m="sm"
            onChange={handleSelectChange}
            onDropdownClose={unfocus}
            value={layerType}
            data={nonEthereal}
        />
    );
};
