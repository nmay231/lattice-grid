import { useMemo } from "react";

export type TextBlits = {
    id: string;
    blitter: "text";
    blits: any;
    style: {
        originY: "top" | "center" | "bottom";
        originX: "left" | "center" | "right";
        size?: number;
    };
};

type TextProps = Pick<TextBlits, "blits" | "style">;

export const Text: React.FC<TextProps> = ({ blits, style }) => {
    const realStyle = useMemo(() => {
        const { originY = "center", originX = "center", size } = style;

        const result: React.SVGAttributes<SVGGElement>["style"] = {
            userSelect: "none",
            direction: "ltr",
            fontFamily: "sans-serif",
            fontSize: size && `${size}px`,
        };

        if (originY === "top") {
            result.dominantBaseline = "hanging";
        } else if (originY === "center") {
            result.dominantBaseline = "central";
        } else if (originY === "bottom") {
            result.dominantBaseline = "alphabetic";
        } else {
            throw Error(`Invalid originY=${originY}`);
        }

        if (originX === "left") {
            result.textAnchor = "start";
        } else if (originX === "center") {
            result.textAnchor = "middle";
        } else if (originX === "right") {
            result.textAnchor = "end";
        } else {
            throw Error(`Invalid originX=${originX}`);
        }

        return result;
    }, [style]);

    return (
        <g style={realStyle}>
            {Object.keys(blits).map((key) => {
                const { text, point, size, textLength, lengthAdjust } = blits[key];
                return (
                    <text
                        key={key}
                        x={point[0]}
                        y={point[1]}
                        fontSize={size && `${size}px`}
                        textLength={textLength && `${textLength}px`}
                        lengthAdjust={lengthAdjust}
                    >
                        {text}
                    </text>
                );
            })}
        </g>
    );
};
