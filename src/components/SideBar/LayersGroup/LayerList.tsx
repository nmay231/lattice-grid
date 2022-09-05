import {
    DndContext,
    DragEndEvent,
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
import { IoMdCheckmark, IoMdClose } from "react-icons/io";
import { layersAtom, setLayers } from "../../../atoms/layers";
import { usePuzzle } from "../../../atoms/puzzle";
import { blurActiveElement } from "../../../utils/DOMUtils";
import { SortableItem } from "../../SortableItem";
import styling from "./LayerList.module.css";

export const LayerList = () => {
    const puzzle = usePuzzle();
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );
    const { layers, currentLayerId } = useAtomValue(layersAtom);

    const handleDragEnd = ({ active, over }: DragEndEvent) => {
        if (over?.id && active.id !== over.id) {
            const ids = layers.map(({ id }) => id);
            const oldIndex = ids.indexOf(active.id);
            const newIndex = ids.indexOf(over.id);
            setLayers(arrayMove(layers, oldIndex, newIndex));
            puzzle.renderChange({ type: "reorder" });
        }
        blurActiveElement();
    };

    const handleSelect = (id: string) => (event: React.PointerEvent) => {
        event.stopPropagation();
        blurActiveElement();
        if (id !== currentLayerId) {
            puzzle.controls.selectLayer({ id });
        }
    };

    const handleDelete = (id: string) => (event: React.PointerEvent) => {
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
            <SortableContext items={layers} strategy={verticalListSortingStrategy}>
                {layers.map(({ id, displayName, ethereal }) => {
                    const current = id === currentLayerId;
                    return (
                        !ethereal && (
                            <SortableItem key={id} id={id}>
                                <div className={styling.nameContainer}>
                                    <span
                                        onPointerDown={handleSelect(id)}
                                        className={
                                            current ? styling.nameSelected : styling.nameNotSelected
                                        }
                                    >
                                        {current && <IoMdCheckmark />}
                                        <span>{displayName}</span>
                                    </span>

                                    <span
                                        onPointerDown={handleDelete(id)}
                                        className={styling.remove}
                                    >
                                        <IoMdClose />
                                    </span>
                                </div>
                            </SortableItem>
                        )
                    );
                })}
            </SortableContext>
        </DndContext>
    );
};
