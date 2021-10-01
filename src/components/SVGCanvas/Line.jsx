export const Line = ({ blits, style }) => {
    return (
        <g style={style}>
            {/* TODO: Stop using index as a key */}
            {blits.map(([start, end], index) => (
                <line
                    x1={start.x}
                    x2={end.x}
                    y1={start.y}
                    y2={end.y}
                    key={index}
                />
            ))}
        </g>
    );
};
