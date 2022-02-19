export const Polygon = ({ blits, style }) => {
    return (
        <g style={style}>
            {Object.keys(blits).map((key) => {
                const { points, style } = blits[key];
                return (
                    <polygon
                        points={points.join(",")}
                        style={style}
                        key={key}
                    />
                );
            })}
        </g>
    );
};
