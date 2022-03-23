import { useMemo } from "react";
import { compile, testCode, testCode2 } from "../../logic/userComputation/run";
import { usePuzzle } from "../PuzzleContext";
import { Group } from "./Group";

export const CodeGroup = () => {
    const puzzle = usePuzzle();
    const [run, run2] = useMemo(() => {
        const context = {
            grid: puzzle.grid,
            storage: puzzle.storage,
            layers: puzzle.layers,
            variables: {},
        };
        return [
            compile(context, testCode).run,
            compile(context, testCode2).run,
        ];
        // const result =
        // return () => result.run();
    }, [puzzle]);

    return (
        <Group name="Your face" expanded>
            <button onClick={run}>Click to run code</button>
            <button onClick={run2}>Click to run the second code</button>
        </Group>
    );
};
