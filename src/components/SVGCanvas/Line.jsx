export const Line = ({ blits, style }) => {
    return (
        <g style={style}>
            {/* TODO: Stop using index as a key */}
            {blits.map(([start, end], index) => (
                <line
                    x1={start[0]}
                    x2={end[0]}
                    y1={start[1]}
                    y2={end[1]}
                    key={index}
                />
            ))}
        </g>
    );
};
