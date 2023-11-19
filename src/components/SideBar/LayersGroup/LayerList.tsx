import { mergeRefs, useEventListener } from "@mantine/hooks";
import { useProxy } from "valtio/utils";
import { usePuzzle, useSettings } from "../../../state/puzzle";
import { useFocusGroup } from "../../../utils/focusManagement";
import { LayerItem } from "./LayerItem";
import { SortableList } from "./SortableList";

export const LayerList = () => {
    const puzzle = usePuzzle();
    const layers = useProxy(puzzle.layers);
    const { pageMode, debugging: debug } = useSettings();

    const { ref: focusGroupRef } = useFocusGroup({ puzzle, group: "layerList" });

    const currentLayerId = layers.currentKey;
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
            items={layers.order.toReversed()}
            handleDragEnd={({ active, over }) => {
                if (over?.id && active.id !== over.id) {
                    puzzle.shuffleLayerOnto(active.id, over.id);
                }
            }}
        >
            <div ref={ref}>
                {layers.order.toReversed().map((id) => {
                    const {
                        klass: { ethereal },
                        displayName,
                    } = layers.map[id];
                    return (
                        (debug || !ethereal) && (
                            <LayerItem
                                key={id}
                                id={id}
                                displayName={displayName}
                                selected={id === layers.currentKey}
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
