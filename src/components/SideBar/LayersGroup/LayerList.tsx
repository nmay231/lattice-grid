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
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { IoMdCheckmark, IoMdClose } from "react-icons/io";
import { useSnapshot } from "valtio";
import { useLayers } from "../../../state/layers";
import { usePuzzle } from "../../../state/puzzle";
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
    const { Layers } = useLayers();
    const snap = useSnapshot(Layers.state);

    const handleDragEnd = ({ active, over }: DragEndEvent) => {
        if (over?.id && active.id !== over.id) {
            Layers.shuffleItemOnto(active as { id: string }, over as { id: string });
            puzzle.renderChange({ type: "reorder" });
        }
        blurActiveElement();
    };

    const handleSelect = (id: string) => (event: React.PointerEvent) => {
        event.stopPropagation();
        blurActiveElement();
        if (id !== Layers.state.currentLayerId) {
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
            <SortableContext
                items={snap.order.map((id) => ({ id }))}
                strategy={verticalListSortingStrategy}
            >
                {snap.order.map((id) => {
                    const current = id === snap.currentLayerId;
                    const { ethereal, displayName } = snap.layers[id];
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
