import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ActionIcon, createStyles } from "@mantine/core";
import { IoIosArrowRoundForward, IoMdClose, IoMdMenu } from "react-icons/io";

const useStyles = createStyles(() => ({
    item: {
        display: "flex",
        borderRadius: "5px",
        margin: "3px 0px",
        "& button": {
            color: "inherit",
            "&:hover": {
                backgroundColor: "transparent",
            },
        },
        "& svg": {
            width: "1em",
            height: "1em",
        },
    },
    itemSelected: {
        backgroundColor: "rgb(175 235 255)",
        outline: "2px solid rgb(130 225 255)",
    },
    handle: {
        cursor: "move",
    },
    itemBody: {
        display: "flex",
        alignItems: "center",
        flexGrow: 1,
        margin: "3px",
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
    handleDelete: React.PointerEventHandler;
};

export const LayerItem: React.FC<Props> = ({ id, displayName, selected, handleDelete }) => {
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
            className={cx(classes.item, selected && classes.itemSelected)}
            style={style}
            {...(editing ? {} : attributes)}
            data-autofocus={selected || undefined}
            data-layerid={id}
            tabIndex={!editing ? 0 : -1}
        >
            <div className={classes.itemBody}>
                <ActionIcon
                    {...(editing ? attributes : {})}
                    {...listeners}
                    className={classes.handle}
                    tabIndex={editing ? 0 : -1}
                >
                    <IoMdMenu />
                </ActionIcon>

                <div className={cx(classes.name, selected && classes.nameSelected)}>
                    {selected && <IoIosArrowRoundForward />}
                    <span>{displayName}</span>
                </div>

                <ActionIcon
                    onPointerDown={handleDelete}
                    className={classes.remove}
                    tabIndex={editing ? 0 : -1}
                >
                    <IoMdClose />
                </ActionIcon>
            </div>
        </div>
    );
};
