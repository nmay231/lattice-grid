import { useState, useRef } from "react";
import { SortableItem } from "./SortableItem";
import {
    DndContext,
    useSensors,
    useSensor,
    PointerSensor,
    KeyboardSensor,
} from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    verticalListSortingStrategy,
    sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { availableLayers } from "../logic/layers";

export const SideBar = ({ puzzle }) => {
    const [items, setItems] = useState(
        puzzle.layers.map(({ displayName }) => displayName)
    );
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );
    const selectRef = useRef();

    const handleDragEnd = ({ active, over }) => {
        if (active.id !== over?.id) {
            setItems((items) => {
                const oldIndex = items.indexOf(active.id);
                const newIndex = items.indexOf(over?.id);
                puzzle.layers = [
                    ...arrayMove(puzzle.layers, oldIndex, newIndex),
                ];
                puzzle.updateScreen();

                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleAddNewLayer = () => {
        const newLayer = availableLayers[selectRef.current.selectedIndex];
        if (newLayer?.unique && items.indexOf(newLayer.displayName) > -1) {
            // TODO: disable the option in the select element to make this easier on the user
            return;
        }
        puzzle.layers.push(new newLayer());
        puzzle.updateScreen();
        setItems(puzzle.layers.map(({ displayName }) => displayName));
    };

    const handleDelete = (index) => () => {
        setItems(items.filter((_, i) => index !== i));
        puzzle.layers.splice(index, 1);
        puzzle.updateScreen();
    };

    // TODO: Handle layer options? Or should that just be listed after the layer list?
    // TODO: The side bar will have more than just this, move this mess to another file
    return (
        <div>
            <div>
                <h1>Layers</h1>
                <div>
                    <label htmlFor="newLayer">Add new layer</label>
                    <select name="NewLayer" ref={selectRef}>
                        {availableLayers.map((layerInit) => (
                            <option
                                value={layerInit.displayName}
                                key={layerInit.displayName}
                            >
                                {layerInit.displayName}
                            </option>
                        ))}
                    </select>
                    <button onPointerDown={handleAddNewLayer}>Add</button>
                </div>
                <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                    <SortableContext
                        items={items}
                        strategy={verticalListSortingStrategy}
                    >
                        {items.map((item, index) => (
                            // TODO: duplicate keys is a HUGE issue
                            <SortableItem key={item} id={item}>
                                <p>{item}</p>
                                <div onPointerDown={handleDelete(index)}>D</div>
                            </SortableItem>
                        ))}
                    </SortableContext>
                </DndContext>
            </div>
        </div>
    );
};
