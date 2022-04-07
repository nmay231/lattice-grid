import { JsonForms } from "@jsonforms/react";
import { vanillaCells, vanillaRenderers } from "@jsonforms/vanilla-renderers";
import { useEffect, useRef } from "react";

// TODO: Styling
export const JsonFormsWrapper = ({
    data,
    setData,
    schema,
    uischema,
    autoFocus = false,
    formId = "LayerSettings",
}) => {
    useEffect(() => {
        if (autoFocus) {
            // Yes... This needs to be in a timeout to work properly
            setTimeout(
                () =>
                    document
                        .querySelector(`#${formId} input, #${formId} select`)
                        ?.focus?.(),
                0,
            );
        }
    }, [formId, autoFocus]);

    // The onChange event is called once on first render. It is annoying.
    const firstRender = useRef(true);

    return (
        <JsonForms
            schema={schema}
            uischema={uischema}
            data={data}
            cells={vanillaCells}
            renderers={vanillaRenderers}
            onChange={({ data, errors }) => {
                if (!errors.length && !firstRender.current) {
                    setData(data);
                }
                firstRender.current = false;
            }}
        />
    );
};
