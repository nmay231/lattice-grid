import { Box, ColorSwatch, Text, clsx } from "@mantine/core";
import { GetInputProps } from "@mantine/form/lib/types";
import { useFocusElementHandler } from "../../utils/focusManagement";
import styles from "./LayerColorPicker.module.css";

// TODO: Better color selection
const theOnlyColorsThatExistOnThePlanet = ["red", "orange", "yellow", "green", "blue", "violet"];

interface Arg1 extends Pick<ReturnType<GetInputProps<any>>, "value" | "onChange"> {
    label: string;
}
export const LayerColorPicker = ({ label, value, onChange }: Arg1) => {
    return (
        <Box ml="8px">
            <Text>{label}</Text>
            {theOnlyColorsThatExistOnThePlanet.map((color) => (
                <Swatch key={color} color={color} selected={color === value} onChange={onChange} />
            ))}
        </Box>
    );
};

interface Arg2 extends Pick<ReturnType<GetInputProps<any>>, "onChange"> {
    selected: boolean;
    color: string;
}

const Swatch = ({ color, selected, onChange }: Arg2) => {
    const { ref } = useFocusElementHandler();

    return (
        <ColorSwatch
            ref={ref}
            component="button"
            type="button"
            onClick={() => onChange(color)}
            radius="sm"
            mr="8px"
            className={clsx(styles.swatch, selected && styles.selectedSwatch)}
            color={color}
        />
    );
};
