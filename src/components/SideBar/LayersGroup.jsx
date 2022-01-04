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
import { useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { availableLayers } from "../../logic/layers";
import { selectLayer, setLayers } from "../../redux/puzzle";
import { SortableItem } from "../SortableItem";
import { Group } from "./Group";

export const LayersGroup = ({ puzzle }) => {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );
    const selectRef = useRef();

    const dispatch = useDispatch();
    const layers = useSelector((state) => state.puzzle.layers);
    const selectedLayer = useSelector((state) => state.puzzle.selectedLayer);

    const handleDragEnd = ({ active, over }) => {
        if (active.id !== over?.id) {
            const ids = layers.map(({ id }) => id);
            const oldIndex = ids.indexOf(active.id);
            const newIndex = ids.indexOf(over?.id);
            dispatch(setLayers(arrayMove(layers, oldIndex, newIndex)));
            // Redraw elements to draw them in the right order
            puzzle.redrawScreen();
        }
    };

    const handleAddNewLayer = () => {
        const id = selectRef.current.value;
        const newLayer = availableLayers[id];
        if (newLayer?.unique && layers.includes(newLayer.displayName)) {
            // TODO: disable the option in the select element to make this easier on the user
            return;
        }
        // PuzzleManager drives Redux, not the other way around
        puzzle.addLayer(newLayer);
        // TODO: incorporate the changes array
        puzzle.redrawScreen();
    };

    const handleSelect = (index) => (event) => {
        event.stopPropagation();
        dispatch(selectLayer({ index }));
    };

    const handleDelete = (id) => (event) => {
        event.stopPropagation();
        puzzle.removeLayer(id);
    };

    // TODO: Handle layer options? Or should that just be listed after the layer group?
    return (
        <Group name="Layers" expanded>
            <div>
                {/* TODO: Implement with a modal */}
                <label htmlFor="newLayer">Add new layer</label>
                <select name="NewLayer" ref={selectRef}>
                    {Object.keys(availableLayers).map((id) => (
                        <option value={id} key={id}>
                            {id}
                        </option>
                    ))}
                </select>
                <button onPointerDown={handleAddNewLayer}>Add</button>
            </div>
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
                        ({ id, hidden }, index) =>
                            !hidden && (
                                <SortableItem key={id} id={id}>
                                    {/* TODO: Change the element to be the whole sortableItem but excluding the itemHandle (and maybe not just a simple onPointDown) */}
                                    <p onPointerDown={handleSelect(index)}>
                                        {index === selectedLayer && "✓"}
                                        {id}
                                    </p>
                                    {/* TODO: Icon (?) */}
                                    <div onPointerDown={handleDelete(id)}>
                                        X
                                    </div>
                                </SortableItem>
                            )
                    )}
                </SortableContext>
            </DndContext>
        </Group>
    );
};
