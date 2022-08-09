import { Button } from "@mantine/core";
import { usePuzzle } from "../../../atoms/puzzle";
import { blurActiveElement } from "../../../utils/DOMUtils";
import { Group } from "../Group";
import { ResizeGridButton } from "./ResizeGridButton";

export const MainGroup = () => {
    const puzzle = usePuzzle();

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

                <Button
                    mt="sm"
                    onClick={() => {
                        // Temporary in it's current form
                        puzzle.freshPuzzle();
                        puzzle.resizeCanvas();
                        puzzle.renderChange({ type: "draw", layerIds: "all" });
                        blurActiveElement();
                    }}
                >
                    Reset Puzzle
                </Button>
            </div>
        </Group>
    );
};
