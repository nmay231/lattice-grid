import { Group } from "../Group";
import { ResizeGridButton } from "./ResizeGridButton";

export const MainGroup = () => {
    return (
        <Group name="Puzzle" expanded>
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    margin: "10px",
                }}
            >
                <ResizeGridButton />
            </div>
        </Group>
    );
};
