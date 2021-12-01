export const Polygon = ({ blits, style }) => {
    return (
        <g style={style}>
            {Object.keys(blits).map((key) => {
                const points = blits[key].join(",");
                return <polygon points={points} key={key} />;
            })}
        </g>
    );
};
