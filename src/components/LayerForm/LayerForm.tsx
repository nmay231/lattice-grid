import { Box, Button, Checkbox, NumberInput, Select, SimpleGrid, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { FormSchema, LayerProps } from "../../types";
import { notify } from "../../utils/notifications";
import { LayerColorPicker } from "./LayerColorPicker";

export interface LayerFormArgs<LP extends LayerProps> extends FormSchema<LP> {
    initialValues: LP["RawSettings"];
    onSubmit?: (values: LP["RawSettings"]) => void;
    onChange?: (values: LP["RawSettings"]) => void;
    submitLabel?: string;
    resetLabel?: string;
}

export const LayerForm = <LP extends LayerProps = LayerProps>({
    elements,
    initialValues,
    onChange,
    onSubmit,
    submitLabel,
    resetLabel,
}: LayerFormArgs<LP>) => {
    const form = useForm({
        initialValues,
        validate(values) {
            onChange?.(values);
            // TODO: Layers might actually have validation in the future, but might as well do this for onChange for now
            return {};
        },
        validateInputOnChange: !!onChange,
    });

    return (
        <form onSubmit={onSubmit && form.onSubmit(onSubmit)}>
            {elements.map((element) => {
                switch (element.type) {
                    case "boolean": {
                        return (
                            <Checkbox
                                key={element.key}
                                mb={5}
                                label={element.label}
                                {...form.getInputProps(element.key, { type: "checkbox" })}
                            />
                        );
                    }
                    case "number": {
                        return (
                            <NumberInput
                                key={element.key}
                                mb={5}
                                label={element.label}
                                min={element.min}
                                max={element.max}
                                {...form.getInputProps(element.key)}
                            />
                        );
                    }
                    case "string": {
                        return (
                            <TextInput
                                key={element.key}
                                mb={5}
                                label={element.label}
                                {...form.getInputProps(element.key)}
                            />
                        );
                    }
                    case "dropdown": {
                        return (
                            <Select
                                key={element.key}
                                mb={5}
                                label={element.label}
                                data={element.pairs}
                                allowDeselect={false}
                                {...form.getInputProps(element.key)}
                            />
                        );
                    }
                    case "color": {
                        return (
                            <Box key={element.key} mb={5}>
                                <LayerColorPicker
                                    label={element.label}
                                    {...form.getInputProps(element.key)}
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
                    <Button type="submit" disabled={!form.isDirty()}>
                        {submitLabel ?? "Submit"}
                    </Button>
                    <Button type="reset" disabled={!form.isDirty()} onClick={form.reset}>
                        {resetLabel ?? "Reset"}
                    </Button>
                </SimpleGrid>
            )}
        </form>
    );
};
