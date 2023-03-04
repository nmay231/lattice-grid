import { Affix, Box } from "@mantine/core";
import { useProxy } from "valtio/utils";
import { usePuzzle, useSettings } from "../state/puzzle";

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

const _DebugPointers = () => {
    const {
        controls: { state },
    } = usePuzzle();
    const { firstPointer: first, secondPointer: second } = useProxy(state);

    return (
        <div>
            {first && (
                <CrossHairs x={first.lastClientXY[0]} y={first.lastClientXY[1]} color="black" />
            )}
            {second && (
                <CrossHairs x={second.lastClientXY[0]} y={second.lastClientXY[1]} color="green" />
            )}
        </div>
    );
};

export const DebugPointers = () => {
    const { debugging } = useSettings();
    if (!debugging) return <></>;

    return <_DebugPointers />;
};
