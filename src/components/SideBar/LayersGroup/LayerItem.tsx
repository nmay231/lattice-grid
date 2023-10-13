import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ActionIcon } from "@mantine/core";
import { clsx } from "clsx";
import { IoIosArrowRoundForward, IoMdClose, IoMdMenu } from "react-icons/io";
import styles from "./LayersItem.module.css";

type LayerItemProps = {
    id: string;
    displayName: string;
    selected: boolean;
    editable: boolean;
    handleDelete: React.PointerEventHandler;
};

export const LayerItem = ({
    id,
    displayName,
    selected,
    editable,
    handleDelete,
}: LayerItemProps) => {
    // TODO: I eventually want to be able to edit the layers using the keyboard
    const editing = false;
    const { setNodeRef, transform, attributes, listeners, transition } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    return (
        <div
            ref={setNodeRef}
            className={clsx(styles.item, selected && styles.itemSelected)}
            style={style}
            {...(editing ? {} : attributes)}
            data-autofocus={selected || undefined}
            data-layerid={id}
            tabIndex={!editing ? 0 : -1}
        >
            <div className={styles.itemBody}>
                {editable && (
                    <ActionIcon
                        {...(editing ? attributes : {})}
                        {...listeners}
                        className={styles.handle}
                        tabIndex={editing ? 0 : -1}
                        bg="none"
                    >
                        <IoMdMenu />
                    </ActionIcon>
                )}

                <div className={clsx(styles.name, selected && styles.nameSelected)}>
                    {selected && <IoIosArrowRoundForward />}
                    <span>{displayName}</span>
                </div>

                {editable && (
                    <ActionIcon
                        onPointerDown={handleDelete}
                        className={styles.remove}
                        tabIndex={editing ? 0 : -1}
                        bg="none"
                    >
                        <IoMdClose />
                    </ActionIcon>
                )}
            </div>
        </div>
    );
};
