import { mergeRefs, useEventListener } from "@mantine/hooks";
import { useSnapshot } from "valtio";
import { useCurrentFocus } from "../../../state/focus";
import { usePuzzle } from "../../../state/puzzle";
import { blurActiveElement, useFocusGroup } from "../../../utils/DOMUtils";
import { LayerItem } from "./LayerItem";
import { SortableList } from "./SortableList";

export const LayerList = () => {
    const puzzle = usePuzzle();
    const snap = useSnapshot(puzzle.layers);

    const [focus] = useCurrentFocus();
    const { ref: focusGroupRef } = useFocusGroup(focus === "layerList");

    const currentLayerId = snap.currentKey;
    const focusInRef = useEventListener("focusin", function (event) {
        const id = (event.target as HTMLElement | null)?.dataset.id || null;
        if (id && id !== currentLayerId) {
            puzzle.selectLayer(id);
        }
    });

    const ref = mergeRefs(focusGroupRef, focusInRef);

    const handleDelete = (id: string) => (event: React.PointerEvent) => {
        event.stopPropagation();
        puzzle.removeLayer(id);
        blurActiveElement();
    };

    return (
        <SortableList
            items={[...snap.order]}
            handleDragEnd={({ active, over }) => {
                if (over?.id && active.id !== over.id) {
                    puzzle.shuffleLayerOnto(active.id, over.id);
                }
                blurActiveElement();
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
                                handleDelete={handleDelete(id)}
                            />
                        )
                    );
                })}
            </div>
        </SortableList>
    );
};
