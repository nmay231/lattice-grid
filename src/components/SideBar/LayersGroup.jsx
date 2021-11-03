import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { availableLayers } from "../../logic/layers";
import { addLayer } from "../../redux/puzzle";
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

    const handleDragEnd = ({ active, over }) => {
        if (active.id !== over?.id) {
            const oldIndex = layers.indexOf(active.id);
            const newIndex = layers.indexOf(over?.id);
            arrayMove(layers, oldIndex, newIndex);
            dispatch(addLayer);
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
    };

    const handleDelete = (id) => () => {
        puzzle.removeLayer(id);
    };

    // TODO: Handle layer options? Or should that just be listed after the layer group?
    return (
        <Group name="Layers" expanded>
            <div>
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
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <SortableContext
                    items={layers}
                    strategy={verticalListSortingStrategy}
                >
                    {layers.map(({ id }) => (
                        <SortableItem key={id} id={id}>
                            <p>{id}</p>
                            <div onPointerDown={handleDelete(id)}>D</div>
                        </SortableItem>
                    ))}
                </SortableContext>
            </DndContext>
        </Group>
    );
};
