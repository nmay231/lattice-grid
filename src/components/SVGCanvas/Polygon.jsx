export const Polygon = ({ blits, style }) => {
    return (
        <g style={style}>
            {/* TODO: Stop using index as a key */}
            {Object.keys(blits).map((key) => {
                const points = blits[key].join(",");
                return <polygon points={points} key={key} />;
            })}
        </g>
    );
};
