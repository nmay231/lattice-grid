import { useState } from "react";
import { SortableItem } from "./SortableItem";
import {
    DndContext,
    closestCenter,
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

    const handleDragEnd = ({ active, over }) => {
        console.log(active, over);
        if (active.id !== over?.id) {
            setItems((items) => {
                const oldIndex = items.indexOf(active.id);
                const newIndex = items.indexOf(over?.id);
                puzzle.layers = [
                    ...arrayMove(puzzle.layers, oldIndex, newIndex),
                ];
                // TODO: Maybe have another function other than a general purpose "update" since I might draw in layers?
                // puzzle.update()

                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };
    console.log(puzzle.layers);

    // TODO: The side bar will have more than just this, move this mess to another file
    return (
        <div>
            <div>
                <h1>Layers</h1>
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={items}
                        strategy={verticalListSortingStrategy}
                    >
                        {items.map((item) => (
                            <SortableItem key={item} id={item}>
                                {item}
                            </SortableItem>
                        ))}
                    </SortableContext>
                </DndContext>
            </div>
        </div>
    );
};
