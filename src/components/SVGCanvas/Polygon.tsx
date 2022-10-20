export type PolygonBlits = {
    id: string;
    blitter: "polygon";
    blits: Record<
        string,
        { points: string[]; style?: React.SVGAttributes<SVGPolygonElement>["style"] }
    >;
    style: React.SVGAttributes<SVGGElement>["style"];
};

type PolygonProps = Pick<PolygonBlits, "blits" | "style">;

export const Polygon: React.FC<PolygonProps> = ({ blits, style }) => {
    return (
        <g style={style}>
            {Object.keys(blits).map((key) => {
                const { points, style } = blits[key];
                return <polygon points={points.join(",")} style={style} key={key} />;
            })}
        </g>
    );
};
