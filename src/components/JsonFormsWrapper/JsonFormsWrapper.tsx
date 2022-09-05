import { JsonSchema, UISchemaElement } from "@jsonforms/core";
import { JsonForms } from "@jsonforms/react";
import { vanillaCells, vanillaRenderers } from "@jsonforms/vanilla-renderers";
import { useRef } from "react";
import { UnknownObject } from "../../types";

type Props = {
    data: UnknownObject;
    setData: (arg: UnknownObject) => void;
    schema?: JsonSchema;
    uischema?: UISchemaElement;
    autoFocus?: boolean;
    formId?: string;
};

// TODO: Styling
export const JsonFormsWrapper: React.FC<Props> = ({ data, setData, schema, uischema }) => {
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
                if (!errors?.length && !firstRender.current) {
                    setData(data);
                }
                firstRender.current = false;
            }}
        />
    );
};
