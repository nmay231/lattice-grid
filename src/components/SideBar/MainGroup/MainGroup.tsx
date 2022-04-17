import { Group } from "../Group";
import { ResizeGridButton } from "./ResizeGridButton";

export const MainGroup = () => {
    return (
        <Group name="Puzzle" expanded>
            Resize Grid
            <ResizeGridButton />
        </Group>
    );
};
