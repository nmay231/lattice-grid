/* eslint-disable @typescript-eslint/no-unused-vars */
// import { JsonSchema, UISchemaElement } from "@jsonforms/core";
// import { JsonForms } from "@jsonforms/react";
// import { vanillaCells, vanillaRenderers } from "@jsonforms/vanilla-renderers";
import { useRef } from "react";
import { NeedsUpdating, UnknownObject } from "../../types";

// Try disabling anything to do with JSONForms, then I know I just need a replacement
type JsonSchema = NeedsUpdating;
type UISchemaElement = NeedsUpdating;

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
        <div>JSONForms, baby1</div>
        // <JsonForms
        //     schema={schema}
        //     uischema={uischema}
        //     data={data}
        //     cells={vanillaCells}
        //     renderers={vanillaRenderers}
        //     onChange={({ data, errors }) => {
        //         if (!errors?.length && !firstRender.current) {
        //             setData(data);
        //         }
        //         firstRender.current = false;
        //     }}
        // />
    );
};
