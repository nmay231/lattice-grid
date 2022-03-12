import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { closeModal } from "../../redux/modal";
import { JsonFormsWrapper } from "../JsonFormsWrapper";
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

    useEffect(() => {
        if (isOpen) {
            setData(initialData);
        }
    }, [isOpen, initialData]);

    if (!isOpen) {
        return <></>;
    }

    const handleCancel = (e) => {
        e?.stopPropagation();
        dispatch(closeModal({ result: "cancel" }));
    };
    const handleKeyDown = (e) => {
        if (e.code === "Escape") {
            handleCancel();
        }
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        dispatch(closeModal({ result: "submit", data }));
    };

    // TODO: generalize to handle more than just "Add a new layer"
    return (
        <div
            className={styles.modalBackground}
            onClick={handleCancel}
            onKeyDown={handleKeyDown}
        >
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
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
