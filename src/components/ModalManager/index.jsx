import { JsonForms } from "@jsonforms/react";
import { vanillaCells, vanillaRenderers } from "@jsonforms/vanilla-renderers";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { closeModal } from "../../redux/modal";
import styles from "./index.module.css";

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
        if (initialData) {
            setData(initialData);

            // Yes... This needs to be in a timeout to work properly
            setTimeout(
                () =>
                    document
                        .querySelector("#modalForm input, #modalForm select")
                        ?.focus?.(),
                0
            );
        }
    }, [initialData]);

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
        dispatch(closeModal({ result: "success", data }));
    };

    return (
        <div
            className={styles.modalBackground}
            onClick={handleCancel}
            onKeyDown={handleKeyDown}
        >
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <form onSubmit={handleSubmit} id="modalForm">
                    <JsonForms
                        schema={schema}
                        uischema={uischema}
                        data={data}
                        cells={vanillaCells}
                        renderers={vanillaRenderers}
                        onChange={({ data, errors }) => {
                            if (!errors.length) {
                                setData(data);
                            }
                        }}
                    />
                    <button type="submit">Click me</button>
                </form>
            </div>
        </div>
    );
};
