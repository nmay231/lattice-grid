import { useMemo } from "react";
import { usePuzzle } from "../../atoms/puzzle";
import { compile, testCode, testCode2 } from "../../logic/userComputation/run";
import { Group } from "./Group";

export const CodeGroup = () => {
    const puzzle = usePuzzle();
    const [run, run2] = useMemo(() => {
        const context = {
            grid: puzzle.grid,
            storage: puzzle.storage,
            layers: puzzle.layers,
            variables: {},
            puzzleErrors: [],
            puzzleWarnings: [],
        };
        return [
            compile(context, testCode).run,
            compile(context, testCode2).run,
        ].map((runFunc) => {
            return () => {
                runFunc();
                if (context.puzzleWarnings.length) {
                    console.log("Warning:", context.puzzleWarnings);
                }
                if (context.puzzleErrors.length) {
                    console.log("Error:", context.puzzleErrors);
                }
            };
        });
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
