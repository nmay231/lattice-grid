import { mergeRefs, useEventListener } from "@mantine/hooks";
import { useSnapshot } from "valtio";
import { usePuzzle, useSettings } from "../../../state/puzzle";
import { useFocusGroup } from "../../../utils/focusManagement";
import { LayerItem } from "./LayerItem";
import { SortableList } from "./SortableList";

export const LayerList = () => {
    const puzzle = usePuzzle();
    const snap = useSnapshot(puzzle.layers);
    const { pageMode } = useSettings();

    const { ref: focusGroupRef } = useFocusGroup({ puzzle, group: "layerList" });

    const currentLayerId = snap.currentKey;
    const focusInRef = useEventListener("focusin", function (event) {
        const target = event.target as HTMLElement | null;

        const id = target?.dataset.layerid || null;
        if (id && id !== currentLayerId) {
            puzzle.selectLayer(id);
        }
    });

    const ref = mergeRefs(focusInRef, focusGroupRef);

    const handleDelete = (id: string) => (event: React.PointerEvent) => {
        event.stopPropagation();
        puzzle.removeLayer(id);
    };

    return (
        <SortableList
            items={[...snap.order]}
            handleDragEnd={({ active, over }) => {
                if (over?.id && active.id !== over.id) {
                    puzzle.shuffleLayerOnto(active.id, over.id);
                }
            }}
        >
            <div ref={ref}>
                {snap.order.map((id) => {
                    const { ethereal, displayName } = snap.map[id];
                    return (
                        !ethereal && (
                            <LayerItem
                                key={id}
                                id={id}
                                displayName={displayName}
                                selected={id === snap.currentKey}
                                editable={pageMode === "edit"}
                                handleDelete={handleDelete(id)}
                            />
                        )
                    );
                })}
            </div>
        </SortableList>
    );
};
