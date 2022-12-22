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
import { createStyles } from "@mantine/core";
import { IoMdCheckmark, IoMdClose } from "react-icons/io";
import { useSnapshot } from "valtio";
import { usePuzzle } from "../../../state/puzzle";
import { blurActiveElement } from "../../../utils/DOMUtils";
import { SortableItem } from "../../SortableItem";

const useStyles = createStyles(() => ({
    nameContainer: {
        alignItems: "center",
        display: "flex",
        width: "100%",
        fontSize: "1em",
        margin: "0px",
    },
    name: {
        cursor: "pointer",
        textAlign: "center",
        flexGrow: 1, // Make it larger and easier to click on
        margin: "0px 7px",
    },
    nameSelected: {
        paddingRight: "1em", // Adjust for the icon to the left of the text
    },
    remove: {
        cursor: "pointer",
    },
}));

export const LayerList = () => {
    const puzzle = usePuzzle();
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );
    const snap = useSnapshot(puzzle.layers);

    const { classes, cx } = useStyles();

    const handleDragEnd = ({ active, over }: DragEndEvent) => {
        if (over?.id && active.id !== over.id) {
            puzzle.shuffleLayerOnto(active.id.toString(), over.id.toString());
        }
        blurActiveElement();
    };

    const handleSelect = (id: string) => (event: React.PointerEvent) => {
        event.stopPropagation();
        blurActiveElement();
        if (id !== puzzle.layers.currentKey) {
            puzzle.selectLayer({ id });
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
                    const current = id === snap.currentKey;
                    const { ethereal, displayName } = snap.map[id];
                    return (
                        !ethereal && (
                            <SortableItem key={id} id={id}>
                                <div className={classes.nameContainer}>
                                    <span
                                        onPointerDown={handleSelect(id)}
                                        className={cx(
                                            classes.name,
                                            current && classes.nameSelected,
                                        )}
                                    >
                                        {current && <IoMdCheckmark />}
                                        <span>{displayName}</span>
                                    </span>

                                    <span
                                        onPointerDown={handleDelete(id)}
                                        className={classes.remove}
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
