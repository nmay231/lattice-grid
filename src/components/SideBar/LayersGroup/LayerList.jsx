import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useAtomValue } from "jotai";
import { layersAtom, selectLayer, setLayers } from "../../../atoms/layers";
import { usePuzzle } from "../../../atoms/puzzle";
import { blurActiveElement } from "../../../utils/DOMUtils";
import { SortableItem } from "../../SortableItem";

export const LayerList = () => {
    const puzzle = usePuzzle();
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );
    const { layers, currentLayerId } = useAtomValue(layersAtom);

    const handleDragEnd = ({ active, over }) => {
        if (active.id !== over?.id) {
            const ids = layers.map(({ id }) => id);
            const oldIndex = ids.indexOf(active.id);
            const newIndex = ids.indexOf(over?.id);
            setLayers(arrayMove(layers, oldIndex, newIndex));
            puzzle.redrawScreen();
        }
        blurActiveElement();
    };

    const handleSelect = (id) => (event) => {
        event.stopPropagation();
        selectLayer({ id });
        puzzle.redrawScreen();
        blurActiveElement();
    };

    const handleDelete = (id) => (event) => {
        event.stopPropagation();
        puzzle.removeLayer(id);
        blurActiveElement();
    };

    return (
        <DndContext
            sensors={sensors}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis]}
        >
            <SortableContext
                items={layers}
                strategy={verticalListSortingStrategy}
            >
                {layers.map(
                    ({ id, hidden }) =>
                        !hidden && (
                            <SortableItem key={id} id={id}>
                                {/* TODO: Change the element to be the whole sortableItem but excluding the itemHandle (and maybe not just a simple onPointDown) */}
                                <p onPointerDown={handleSelect(id)}>
                                    {id === currentLayerId && "✓"}
                                    {id}
                                </p>
                                {/* TODO: Icon (?) */}
                                <div onPointerDown={handleDelete(id)}>X</div>
                            </SortableItem>
                        ),
                )}
            </SortableContext>
        </DndContext>
    );
};
