import { Box, Button, Checkbox, NumberInput, Select, SimpleGrid, TextInput } from "@mantine/core";
import { isEqual } from "lodash";
import { useCallback, useState } from "react";
import { FormSchema, FormSchemaElement, LayerProps } from "../../types";
import { notify } from "../../utils/notifications";
import { LayerColorPicker } from "./LayerColorPicker";

export interface LayerFormArgs<LP extends LayerProps> extends FormSchema<LP> {
    initialValues: LP["Settings"];
    onSubmit?: (newSettings: LP["Settings"]) => void;
    onChange?: (key: string, value: unknown) => void;
    submitLabel?: string;
    resetLabel?: string;
}

export const LayerForm = <LP extends LayerProps = LayerProps>({
    elements,
    initialValues: initialData,
    onChange,
    onSubmit,
    submitLabel,
    resetLabel,
}: LayerFormArgs<LP>) => {
    const [data, setData] = useState(initialData);
    const [dirty, setDirty] = useState(false);

    const handleChange = useCallback(
        (key: string, value: unknown) => {
            onChange?.(key, value);
            const newData = { ...data, [key]: value };
            setData(newData);
            setDirty(!isEqual(newData, initialData));
        },
        [data, initialData, onChange],
    );

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                onSubmit?.(data);
            }}
        >
            {Object.entries(elements).map(([key, element_]) => {
                const element = element_ as FormSchemaElement;
                switch (element.type) {
                    case "boolean": {
                        return (
                            <Checkbox
                                key={key}
                                mb={5}
                                label={element.label}
                                checked={data[key as never]}
                                onChange={(event) => handleChange(key, event.target.checked)}
                            />
                        );
                    }
                    case "number": {
                        return (
                            <NumberInput
                                key={key}
                                mb={5}
                                label={element.label}
                                min={element.min}
                                max={element.max}
                                value={data[key as never]}
                                onChange={(value) => handleChange(key, +value)}
                            />
                        );
                    }
                    case "string": {
                        return (
                            <TextInput
                                key={key}
                                mb={5}
                                label={element.label}
                                value={data[key as never]}
                                onChange={(event) => handleChange(key, event.target.value)}
                            />
                        );
                    }
                    case "dropdown": {
                        return (
                            <Select
                                key={key}
                                mb={5}
                                label={element.label}
                                data={element.pairs}
                                allowDeselect={false}
                                value={data[key as never]}
                                onChange={(value) => handleChange(key, value)}
                            />
                        );
                    }
                    case "color": {
                        return (
                            <Box key={key} mb={5}>
                                <LayerColorPicker
                                    label={element.label}
                                    value={data[key as never]}
                                    onChange={(color) => handleChange(key, color)}
                                />
                            </Box>
                        );
                    }
                    default: {
                        notify.error({ message: `Unexpected form type: ${(element as any).type}` });
                        return;
                    }
                }
            })}
            {onSubmit && (
                <SimpleGrid cols={2} m="sm">
                    <Button type="submit" disabled={!dirty}>
                        {submitLabel ?? "Submit"}
                    </Button>
                    <Button
                        type="reset"
                        disabled={!dirty}
                        onClick={() => {
                            setData(initialData);
                        }}
                    >
                        {resetLabel ?? "Reset"}
                    </Button>
                </SimpleGrid>
            )}
        </form>
    );
};
