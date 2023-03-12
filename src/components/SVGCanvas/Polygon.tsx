import React from "react";
import { Point } from "../../types";

export type PolygonBlits = {
    id: string;
    blitter: "polygon";
    blits: Record<
        string,
        { points: Point[]; style?: React.SVGAttributes<SVGPolygonElement>["style"] }
    >;
    style: React.SVGAttributes<SVGGElement>["style"];
};

type PolygonProps = Pick<PolygonBlits, "blits" | "style">;

export const Polygon: React.FC<PolygonProps> = React.memo(function Polygon({ blits, style }) {
    return (
        <g style={style}>
            {Object.keys(blits).map((key) => {
                const { points, style } = blits[key];
                return <polygon points={points.join(",")} style={style} key={key} />;
            })}
        </g>
    );
});
