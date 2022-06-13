import { useMemo } from "react";
import { usePuzzle } from "../../atoms/puzzle";
import { Context } from "../../logic/userComputation/run";
import { ToggleBlocklyModal } from "../Blockly/BlocklyModal";
import { Group } from "./Group";

export const CodeGroup = () => {
    const puzzle = usePuzzle();
    const [run, run2] = useMemo(() => {
        const context: Context = {
            grid: puzzle.grid,
            storage: puzzle.storage,
            layers: puzzle.layers,
            variables: {},
            compilerErrors: [],
            puzzleErrors: [],
            puzzleWarnings: [],
        };
        // TODO: Fix compiler errors
        return (
            [
                // compile(context, testCode).run,
                // compile(context, testCode2).run,
            ] as any[]
        ).map((runFunc) => {
            return () => {
                if (context.compilerErrors.length) {
                    console.log("Warning:", context.compilerErrors);
                    context.compilerErrors = [];
                    return;
                }
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
            <ToggleBlocklyModal />
        </Group>
    );
};
