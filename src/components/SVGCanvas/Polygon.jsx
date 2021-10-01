export const Polygon = ({ blits, style }) => {
    return (
        <g style={style}>
            {/* TODO: Stop using index as a key */}
            {blits.map((points, index) => (
                <polygon points={points.join(",")} key={index} />
            ))}
        </g>
    );
};
