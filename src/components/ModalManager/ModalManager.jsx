import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { closeModal } from "../../redux/modal";
import { blurActiveElement } from "../../utils/DOMUtils";
import { JsonFormsWrapper } from "../JsonFormsWrapper";
import { usePuzzle } from "../PuzzleContext/PuzzleContext";
import styles from "./ModalManager.module.css";

export const ModalManager = () => {
    const {
        isOpen,
        data: initialData,
        schema,
        uischema,
    } = useSelector((state) => state.modal);
    const [data, setData] = useState(initialData);
    const dispatch = useDispatch();
    const puzzle = usePuzzle();

    useEffect(() => {
        if (isOpen) {
            setData(initialData);
        }
    }, [isOpen, initialData]);

    if (!isOpen) {
        return <></>;
    }

    const handleCancel = (event) => {
        event?.stopPropagation();
        dispatch(closeModal({ result: "cancel" }));
        blurActiveElement();
    };
    const handleKeyDown = (event) => {
        if (event.code === "Escape") {
            handleCancel(event);
        }
    };
    const handleSubmit = (event) => {
        event.preventDefault();
        dispatch(closeModal({ result: "submit", data }));
        blurActiveElement();
    };

    // TODO: generalize to handle more than just "Add a new layer"
    return (
        <div className={styles.modalBackground} onPointerDown={handleCancel}>
            <div
                className={styles.modal}
                {...puzzle.controls.stopPropagation}
                onKeyDown={handleKeyDown}
            >
                <form onSubmit={handleSubmit} id="modalForm">
                    <JsonFormsWrapper
                        data={data}
                        setData={setData}
                        schema={schema}
                        uischema={uischema}
                        formId="modalForm"
                        autoFocus
                    />
                    {/* TODO: Customizable buttons */}
                    <button type="submit">Submit</button>
                </form>
            </div>
        </div>
    );
};
