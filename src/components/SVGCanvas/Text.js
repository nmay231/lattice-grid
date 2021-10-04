import { useMemo } from "react";

export const Text = ({ blits, style }) => {
    const realStyle = useMemo(() => {
        const { vertical = "center", horizontal = "center", size } = style;
        let dominantBaseline;
        if (horizontal === "center") {
            dominantBaseline = "central";
        } else {
            throw Error("your face!");
        }

        let textAnchor;
        if (vertical === "center") {
            textAnchor = "middle";
        } else {
            throw Error("your face!");
        }

        return {
            userSelect: "none",
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
