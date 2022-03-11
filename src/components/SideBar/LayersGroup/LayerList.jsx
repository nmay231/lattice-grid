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
import { useDispatch, useSelector } from "react-redux";
import { reorderLayers, selectLayer } from "../../../redux/puzzle";
import { SortableItem } from "../../SortableItem";

export const LayerList = ({ puzzle }) => {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const dispatch = useDispatch();
    const layers = useSelector((state) => state.puzzle.layers);
    const currentLayerId = useSelector((state) => state.puzzle.currentLayerId);

    const handleDragEnd = ({ active, over }) => {
        if (active.id !== over?.id) {
            const ids = layers.map(({ id }) => id);
            const oldIndex = ids.indexOf(active.id);
            const newIndex = ids.indexOf(over?.id);
            dispatch(reorderLayers(arrayMove(layers, oldIndex, newIndex)));
            puzzle.redrawScreen();
        }
    };

    const handleSelect = (id) => (event) => {
        event.stopPropagation();
        dispatch(selectLayer({ id }));
        puzzle.redrawScreen();
    };

    const handleDelete = (id) => (event) => {
        event.stopPropagation();
        puzzle.removeLayer(id);
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
                        )
                )}
            </SortableContext>
        </DndContext>
    );
};
