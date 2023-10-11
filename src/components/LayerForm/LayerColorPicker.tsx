import { Box, ColorSwatch, SimpleGrid, Text, clsx } from "@mantine/core";
import { GetInputProps } from "@mantine/form/lib/types";
import { useFocusElementHandler } from "../../utils/focusManagement";
import styles from "./LayerColorPicker.module.css";

// TODO: Better color selection
const theOnlyColorsThatExistOnThePlanet = [
    "var(--user-light-green)",
    "var(--user-light-blue)",
    "var(--user-light-yelloworange)",
    "var(--user-light-red)",
    "var(--user-light-purple)",
    "var(--user-light-gray)",
    "var(--user-dark-white)",
    "var(--user-dark-green)",
    "var(--user-dark-blue)",
    "var(--user-dark-yelloworange)",
    "var(--user-dark-red)",
    "var(--user-dark-purple)",
    "var(--user-dark-gray)",
    "var(--user-light-white)",
];

interface Arg1 extends Pick<ReturnType<GetInputProps<any>>, "value" | "onChange"> {
    label: string;
}
export const LayerColorPicker = ({ label, value, onChange }: Arg1) => {
    return (
        <Box m="auto">
            <Text>{label}</Text>
            <div className={styles.swatchGrid}>
                {theOnlyColorsThatExistOnThePlanet.map((color) => (
                    <Swatch
                        key={color}
                        color={color}
                        selected={color === value}
                        onChange={onChange}
                    />
                ))}
            </div>
            <SimpleGrid cols={7}></SimpleGrid>
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
            size={35}
            radius="sm"
            mr="8px"
            className={clsx(styles.swatch, selected && styles.selectedSwatch)}
            color={color}
        />
    );
};
