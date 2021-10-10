import { useMemo } from "react";

export const Text = ({ blits, style }) => {
    const realStyle = useMemo(() => {
        const { originY = "center", originX = "center", size } = style;
        let dominantBaseline;
        if (originY === "top") {
            dominantBaseline = "hanging";
        } else if (originY === "center") {
            dominantBaseline = "central";
        } else if (originY === "bottom") {
            dominantBaseline = "alphabetic";
        } else {
            throw Error(`Invalid originY=${originY}`);
        }

        let textAnchor;
        if (originX === "left") {
            textAnchor = "start";
        } else if (originX === "center") {
            textAnchor = "middle";
        } else if (originX === "right") {
            textAnchor = "end";
        } else {
            throw Error(`Invalid originX=${originX}`);
        }

        return {
            userSelect: "none",
            direction: "ltr",
            dominantBaseline,
            textAnchor,
            fontFamily: "sans-serif",
            fontSize: `${size}px`,
        };
    }, [style]);

    return (
        <g style={realStyle}>
            {/* TODO: Stop using index as a key */}
            {blits.map(({ text, point }, index) => (
                <text key={index} x={point[0]} y={point[1]}>
                    {text}
                </text>
            ))}
        </g>
    );
};
