export const Line = ({ blits, params }) => {
    return (
        <g style={params}>
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
