import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    UniqueIdentifier,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {} from "react";
import { NeedsUpdating } from "../../../types";

type Props<S extends UniqueIdentifier> = {
    children: React.ReactNode;
    items: S[];
    handleDragEnd: (arg: { active: { id: S }; over?: { id: S } }) => void;
};

export const SortableList = <S extends UniqueIdentifier = UniqueIdentifier>({
    children,
    items,
    handleDragEnd,
}: Props<S>) => {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    return (
        <DndContext
            sensors={sensors}
            onDragEnd={handleDragEnd as NeedsUpdating}
            modifiers={[restrictToVerticalAxis]}
        >
            <SortableContext items={items} strategy={verticalListSortingStrategy}>
                {children}
            </SortableContext>
        </DndContext>
    );
};
