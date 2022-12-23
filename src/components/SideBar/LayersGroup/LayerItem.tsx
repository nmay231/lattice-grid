import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createStyles } from "@mantine/core";
import { IoMdCheckmark, IoMdClose, IoMdMenu } from "react-icons/io";

const useStyles = createStyles(() => ({
    item: {
        display: "flex",
    },
    itemHandle: {
        cursor: "move",
        margin: "0px",
        marginRight: "3px",
        width: "1em",
        height: "1em",
    },
    itemBody: {
        display: "flex",
        flexGrow: 1,
        margin: "3px",
        alignItems: "center",
        fontSize: "1em",
    },
    name: {
        cursor: "pointer",
        textAlign: "center",
        flexGrow: 1,
        margin: "0px 7px",
    },
    nameSelected: {
        paddingRight: "1em", // Adjust for the icon to the left of the text
    },
    remove: {
        cursor: "pointer",
    },
}));

type Props = {
    id: string;
    displayName: string;
    selected: boolean;
    handleSelect: React.PointerEventHandler;
    handleDelete: React.PointerEventHandler;
};

export const LayerItem: React.FC<Props> = ({
    id,
    displayName,
    selected,
    handleDelete,
    handleSelect,
}) => {
    // TODO: I eventually want to be able to edit the layers using the keyboard
    const editing = false;
    const { classes, cx } = useStyles();
    const { setNodeRef, transform, attributes, listeners, transition } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    return (
        <div
            ref={setNodeRef}
            className={classes.item}
            style={style}
            {...(editing ? {} : attributes)}
            data-autofocus={selected || undefined}
        >
            <div className={classes.itemBody}>
                <div {...(editing ? attributes : {})} {...listeners} className={classes.itemHandle}>
                    <IoMdMenu />
                </div>
                <span
                    onPointerDown={handleSelect}
                    className={cx(classes.name, selected && classes.nameSelected)}
                >
                    {selected && <IoMdCheckmark />}
                    <span>{displayName}</span>
                </span>

                <span
                    onPointerDown={handleDelete}
                    className={classes.remove}
                    tabIndex={editing ? 1 : undefined}
                >
                    <IoMdClose />
                </span>
            </div>
        </div>
    );
};
