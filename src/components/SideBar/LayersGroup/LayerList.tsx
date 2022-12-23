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
import { useCurrentFocus } from "../../../state/focus";
import { usePuzzle } from "../../../state/puzzle";
import { blurActiveElement, useFocusGroup } from "../../../utils/DOMUtils";
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
    const { classes, cx } = useStyles();

    const puzzle = usePuzzle();
    const snap = useSnapshot(puzzle.layers);

    const [focus] = useCurrentFocus();
    const { ref } = useFocusGroup(focus === "layerList");

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

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
                <div ref={ref}>
                    {snap.order.map((id) => {
                        const current = id === snap.currentKey;
                        const { ethereal, displayName } = snap.map[id];
                        return (
                            !ethereal && (
                                <SortableItem
                                    key={id}
                                    id={id}
                                    data-autofocus={current || undefined}
                                >
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
                </div>
            </SortableContext>
        </DndContext>
    );
};
