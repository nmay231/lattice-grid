import React from "react";

export type LineBlits = {
    id: string;
    blitter: "line";
    blits: Record<
        string,
        {
            x1: number;
            y1: number;
            x2: number;
            y2: number;
            style?: React.SVGAttributes<SVGGElement>["style"];
        }
    >;
    style?: React.SVGAttributes<SVGGElement>["style"];
};

type LineProps = Pick<LineBlits, "blits" | "style">;

export const Line: React.FC<LineProps> = React.memo(function Line({ blits, style }) {
    return (
        <g style={style}>
            {Object.keys(blits).map((key) => {
                const { style, x1, y1, x2, y2 } = blits[key];
                return <line x1={x1} x2={x2} y1={y1} y2={y2} style={style} key={key} />;
            })}
        </g>
    );
});
