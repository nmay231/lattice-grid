import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IoMdMenu } from "react-icons/io";
import styling from "./SortableItem.module.css";

type Props = {
    children: React.ReactNode;
    id: string;
};

export const SortableItem: React.FC<Props> = ({ children, id }) => {
    const { setNodeRef, transform, attributes, listeners, transition } =
        useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    return (
        <div
            ref={setNodeRef}
            className={styling.item}
            style={style}
            {...attributes}
        >
            <div className={styling.itemBody}>
                <div
                    {...attributes}
                    {...listeners}
                    className={styling.itemHandle}
                >
                    <IoMdMenu />
                </div>
                {children}
            </div>
        </div>
    );
};
