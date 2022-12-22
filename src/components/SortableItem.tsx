import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createStyles } from "@mantine/core";
import { IoMdMenu } from "react-icons/io";

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
        "& > p": {
            margin: "0px",
        },
    },
}));

type Props = {
    children: React.ReactNode;
    id: string;
};

export const SortableItem: React.FC<Props> = ({ children, id }) => {
    const { classes } = useStyles();
    const { setNodeRef, transform, attributes, listeners, transition } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    return (
        <div ref={setNodeRef} className={classes.item} style={style} {...attributes}>
            <div className={classes.itemBody}>
                <div {...attributes} {...listeners} className={classes.itemHandle}>
                    <IoMdMenu />
                </div>
                {children}
            </div>
        </div>
    );
};
