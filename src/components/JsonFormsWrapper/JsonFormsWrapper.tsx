import { JsonSchema, UISchemaElement } from "@jsonforms/core";
import { JsonForms } from "@jsonforms/react";
import { vanillaCells, vanillaRenderers } from "@jsonforms/vanilla-renderers";
import { useRef } from "react";
import { UnknownObject } from "../../types";

type Props = {
    data: UnknownObject;
    onChange: (arg: UnknownObject) => void;
    schema: JsonSchema;
    uischema: UISchemaElement;
};

// TODO: Styling
export const JsonFormsWrapper: React.FC<Props> = ({ data, onChange, schema, uischema }) => {
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
                    onChange(data);
                }
                firstRender.current = false;
            }}
        />
    );
};
