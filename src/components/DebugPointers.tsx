import { Affix, Box } from "@mantine/core";
import React from "react";
import { useProxy } from "valtio/utils";
import { PuzzleManager } from "../PuzzleManager";

const CrossHairs = ({ x = 0, y = 0, color = "black" }) => {
    return (
        <>
            {/* Left side */}
            <Affix position={{ top: y, left: 0 }}>
                <Box w={30} h={5} bg={color}></Box>
            </Affix>
            {/* Top side */}
            <Affix position={{ left: x, top: 0 }}>
                <Box w={5} h={30} bg={color}></Box>
            </Affix>
        </>
    );
};

const _DebugPointers = ({ puzzle }: { puzzle: PuzzleManager }) => {
    const {
        controls: { state },
    } = puzzle;
    const { mode, firstPointer: first, secondPointer: second } = useProxy(state);

    return (
        <div>
            <Affix position={{ left: 0, top: 0 }}>
                <Box p={3} bg="gray">
                    pointerMode={mode}
                </Box>
            </Affix>
            {first && (
                <CrossHairs x={first.lastClientXY[0]} y={first.lastClientXY[1]} color="black" />
            )}
            {second && (
                <CrossHairs x={second.lastClientXY[0]} y={second.lastClientXY[1]} color="green" />
            )}
        </div>
    );
};

export const DebugPointers = React.memo(function DebugPointers({
    puzzle,
}: {
    puzzle: PuzzleManager;
}) {
    const { debugging } = useProxy(puzzle.settings);
    if (!debugging) return <></>;

    return <_DebugPointers puzzle={puzzle} />;
});
