export const Line = ({ blits, style }) => {
    return (
        <g style={style}>
            {Object.keys(blits).map((key) => {
                const [[x1, y1], [x2, y2]] = blits[key];
                return <line x1={x1} x2={x2} y1={y1} y2={y2} key={key} />;
            })}
        </g>
    );
};
